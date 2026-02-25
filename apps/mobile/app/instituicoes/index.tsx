import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, Modal, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { WebView } from 'react-native-webview'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Conexao {
  id: string
  item_id: string
  connector_name: string
  status: string
  last_sync_at: string | null
  created_at: string
}

interface Conta {
  id: string
  connection_id: string
  name: string
  type: string
  subtype: string | null
  balance: number
  currency_code: string
  credit_limit: number | null
  available_credit_limit: number | null
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusInfo(status: string): { label: string; cor: string; bg: string; icon: any } {
  switch (status?.toUpperCase()) {
    case 'UPDATED': return { label: 'Atualizado', cor: theme.income, bg: '#dcfce7', icon: 'checkmark-circle' }
    case 'UPDATING': return { label: 'Atualizando', cor: '#f59e0b', bg: '#fef3c7', icon: 'time' }
    case 'LOGIN_ERROR': return { label: 'Erro de login', cor: theme.expense, bg: '#fee2e2', icon: 'alert-circle' }
    case 'WAITING_USER_INPUT': return { label: 'Aguardando', cor: '#6366f1', bg: '#ede9fe', icon: 'hand-left' }
    default: return { label: status ?? 'Desconhecido', cor: theme.textMuted, bg: theme.surfaceHigh, icon: 'help-circle' }
  }
}

function buildPluggyHTML(connectToken: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #ffffff; }
    #loading {
      position: fixed; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 16px; background: #fff; z-index: 10;
    }
    #loading p { font-family: -apple-system, sans-serif; font-size: 14px; color: #666; }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid #e5e7eb;
      border-top-color: #1a7a4a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <p>Carregando widget...</p>
  </div>

  <script>
    function postMsg(obj) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
    }

    function initPluggy() {
      if (typeof PluggyConnect === 'undefined') {
        setTimeout(initPluggy, 300);
        return;
      }
      document.getElementById('loading').style.display = 'none';
      try {
        var widget = new PluggyConnect({
          connectToken: '${connectToken}',
          includeSandbox: true,
          onSuccess: function(data) {
            postMsg({ type: 'success', itemId: data.item.id });
          },
          onError: function(err) {
            var msg = (err && err.message) ? err.message : 'Erro desconhecido';
            postMsg({ type: 'error', message: msg });
          },
          onClose: function() {
            postMsg({ type: 'close' });
          }
        });
        widget.init();
      } catch(e) {
        postMsg({ type: 'error', message: e.message || 'Erro ao iniciar widget' });
      }
    }

    // Carrega o script do Pluggy dinamicamente
    var script = document.createElement('script');
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';
    script.onload = function() { initPluggy(); };
    script.onerror = function() {
      postMsg({ type: 'error', message: 'Não foi possível carregar o widget. Verifique sua conexão.' });
    };
    document.head.appendChild(script);
  </script>
</body>
</html>
`
}

export default function InstituicoesScreen() {
  const [conexoes, setConexoes] = useState<Conexao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [webviewOpen, setWebviewOpen] = useState(false)
  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)

  useEffect(() => { loadDados() }, [])

  async function loadDados() {
    try {
      const [{ data: conns }, { data: accs }] = await Promise.all([
        supabase.from('pluggy_connections').select('*').order('created_at', { ascending: false }),
        supabase.from('pluggy_accounts').select('*').order('name'),
      ])
      setConexoes((conns as Conexao[]) ?? [])
      setContas((accs as Conta[]) ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function abrirPluggy() {
    setLoadingToken(true)
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-connect')
      if (error || !data?.success) throw new Error(data?.error ?? 'Erro ao obter token')
      setConnectToken(data.connectToken)
      setWebviewOpen(true)
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível iniciar a conexão.')
    } finally {
      setLoadingToken(false)
    }
  }

  function fecharWebview() {
    setWebviewOpen(false)
    setConnectToken(null)
  }

  async function sincronizar(itemId: string) {
    setSyncing(itemId)
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: { action: 'refresh', itemId },
      })
      if (error || !data?.success) throw new Error(data?.error ?? 'Erro ao sincronizar')
      Alert.alert('✅ Sucesso', 'Transações sincronizadas com sucesso.')
      await loadDados()
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível sincronizar.')
    } finally {
      setSyncing(null)
    }
  }

  async function remover(itemId: string, nome: string) {
    Alert.alert(
      'Remover conexão',
      `Deseja remover a conexão com ${nome}? Os dados já sincronizados serão mantidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive', onPress: async () => {
            setDeletando(itemId)
            try {
              const { data, error } = await supabase.functions.invoke('pluggy-sync', {
                body: { action: 'delete', itemId },
              })
              if (error || !data?.success) throw new Error(data?.error ?? 'Erro ao remover')
              await loadDados()
            } catch (e: any) {
              Alert.alert('Erro', e.message ?? 'Não foi possível remover a conexão.')
            } finally {
              setDeletando(null)
            }
          }
        },
      ]
    )
  }

  async function handleWebViewMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data)

      if (msg.type === 'success') {
        fecharWebview()
        setSyncing(msg.itemId)
        try {
          const { data, error } = await supabase.functions.invoke('pluggy-sync', {
            body: { action: 'save-connection', itemId: msg.itemId },
          })
          if (error || !data?.success) throw new Error(data?.error ?? 'Erro ao salvar')
          Alert.alert('✅ Conectado!', `${data.accountsCount ?? ''} conta(s) sincronizada(s) com sucesso.`)
          await loadDados()
        } catch (e: any) {
          Alert.alert('Erro', e.message)
        } finally {
          setSyncing(null)
        }
      } else if (msg.type === 'error') {
        fecharWebview()
        Alert.alert('Erro na conexão', msg.message)
      } else if (msg.type === 'close') {
        fecharWebview()
      }
    } catch (e) {
      console.error('WebView message error:', e)
    }
  }

  // Totais
  const totalBanco = contas.filter(c => c.type === 'BANK').reduce((a, c) => a + (c.balance ?? 0), 0)
  const totalCredito = contas.filter(c => c.type === 'CREDIT').reduce((a, c) => a + Math.abs(c.balance ?? 0), 0)

  return (
    <View style={styles.container}>

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitulo}>Instituições Financeiras</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Modal WebView Pluggy */}
      <Modal
        visible={webviewOpen}
        animationType="slide"
        onRequestClose={fecharWebview}
      >
        <View style={{ flex: 1, backgroundColor: theme.surface }}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity onPress={fecharWebview} style={styles.backBtn}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.navTitulo}>Conectar Banco</Text>
            <View style={{ width: 36 }} />
          </View>

          {connectToken ? (
            <WebView
              source={{ html: buildPluggyHTML(connectToken) }}
              style={{ flex: 1 }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              originWhitelist={['*']}
              onError={(e) => {
                console.error('WebView error:', e.nativeEvent)
                Alert.alert('Erro', 'Não foi possível carregar o widget.')
                fecharWebview()
              }}
            />
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          )}
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadDados() }}
              tintColor={theme.primary}
            />
          }
        >

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcone}>
              <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitulo}>Open Finance</Text>
              <Text style={styles.heroDesc}>Conecte suas contas de forma segura via Open Finance Brasil</Text>
            </View>
          </View>

          {/* Badges segurança */}
          <View style={styles.badgesRow}>
            {[
              { icon: 'shield-outline', label: 'Banco Central' },
              { icon: 'checkmark-circle-outline', label: 'Conformidade LGPD' },
              { icon: 'lock-closed-outline', label: 'Criptografado' },
            ].map((b, i) => (
              <View key={i} style={styles.badge}>
                <Ionicons name={b.icon as any} size={12} color={theme.primary} />
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Botão conectar */}
          <TouchableOpacity
            style={[styles.btnConectar, loadingToken && { opacity: 0.7 }]}
            onPress={abrirPluggy}
            disabled={loadingToken || syncing !== null}
            activeOpacity={0.8}
          >
            {loadingToken
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="link" size={18} color="#fff" />
            }
            <Text style={styles.btnConectarText}>
              {loadingToken ? 'Carregando...' : 'Conectar Banco'}
            </Text>
          </TouchableOpacity>

          {/* Resumo de saldos */}
          {contas.length > 0 && (
            <View style={styles.resumoRow}>
              <View style={styles.resumoCard}>
                <Ionicons name="wallet-outline" size={18} color={theme.income} />
                <Text style={styles.resumoLabel}>Saldo em conta</Text>
                <Text style={[styles.resumoValor, { color: theme.income }]}>{formatBRL(totalBanco)}</Text>
              </View>
              <View style={styles.resumoCard}>
                <Ionicons name="card-outline" size={18} color={theme.expense} />
                <Text style={styles.resumoLabel}>Crédito usado</Text>
                <Text style={[styles.resumoValor, { color: theme.expense }]}>{formatBRL(totalCredito)}</Text>
              </View>
            </View>
          )}

          {/* Conexões */}
          {conexoes.length === 0 ? (
            <View style={styles.vazio}>
              <Ionicons name="business-outline" size={40} color={theme.textMuted} />
              <Text style={styles.vazioTitulo}>Nenhuma conexão</Text>
              <Text style={styles.vazioDesc}>
                Conecte seus bancos para visualizar saldos e transações automaticamente.
              </Text>
            </View>
          ) : (
            conexoes.map(conn => {
              const st = statusInfo(conn.status)
              const contasConn = contas.filter(c => c.connection_id === conn.id)
              const isSyncing = syncing === conn.item_id
              const isDeleting = deletando === conn.item_id

              return (
                <View key={conn.id} style={styles.connCard}>
                  <View style={styles.connHeader}>
                    <View style={styles.connIcone}>
                      <Ionicons name="business" size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.connNome}>{conn.connector_name}</Text>
                      {conn.last_sync_at && (
                        <Text style={styles.connSync}>Última sync: {formatData(conn.last_sync_at)}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Ionicons name={st.icon} size={12} color={st.cor} />
                      <Text style={[styles.statusText, { color: st.cor }]}>{st.label}</Text>
                    </View>
                  </View>

                  {contasConn.map(conta => (
                    <View key={conta.id} style={styles.contaRow}>
                      <View style={styles.contaIcone}>
                        <Ionicons
                          name={conta.type === 'CREDIT' ? 'card-outline' : 'wallet-outline'}
                          size={14}
                          color={theme.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contaNome} numberOfLines={1}>{conta.name}</Text>
                        {conta.subtype && <Text style={styles.contaTipo}>{conta.subtype}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.contaSaldo, { color: conta.type === 'CREDIT' ? theme.expense : theme.income }]}>
                          {formatBRL(conta.balance)}
                        </Text>
                        {conta.type === 'CREDIT' && conta.credit_limit && (
                          <Text style={styles.contaLimite}>Limite: {formatBRL(conta.credit_limit)}</Text>
                        )}
                      </View>
                    </View>
                  ))}

                  <View style={styles.connAcoes}>
                    <TouchableOpacity
                      style={[styles.btnAcao, { borderColor: theme.primary }]}
                      onPress={() => sincronizar(conn.item_id)}
                      disabled={isSyncing || isDeleting}
                      activeOpacity={0.7}
                    >
                      {isSyncing
                        ? <ActivityIndicator size="small" color={theme.primary} />
                        : <Ionicons name="refresh" size={14} color={theme.primary} />
                      }
                      <Text style={[styles.btnAcaoText, { color: theme.primary }]}>
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAcao, { borderColor: theme.expense }]}
                      onPress={() => remover(conn.item_id, conn.connector_name)}
                      disabled={isSyncing || isDeleting}
                      activeOpacity={0.7}
                    >
                      {isDeleting
                        ? <ActivityIndicator size="small" color={theme.expense} />
                        : <Ionicons name="trash-outline" size={14} color={theme.expense} />
                      }
                      <Text style={[styles.btnAcaoText, { color: theme.expense }]}>
                        {isDeleting ? 'Removendo...' : 'Remover'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}

        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 6, borderRadius: 20, backgroundColor: theme.bg },
  navTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.surfaceHigh, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  heroIcone: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center',
  },
  heroTitulo: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
  heroDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },

  badgesRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.surface, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: theme.border,
  },
  badgeText: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },

  btnConectar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, padding: 16,
    marginBottom: 20,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnConectarText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  resumoCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border,
  },
  resumoLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  resumoValor: { fontSize: 14, fontWeight: 'bold' },

  vazio: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  vazioTitulo: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  vazioDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },

  connCard: {
    backgroundColor: theme.surface, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  connHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  connIcone: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.surfaceHigh, justifyContent: 'center', alignItems: 'center',
  },
  connNome: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  connSync: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  contaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  contaIcone: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center',
  },
  contaNome: { fontSize: 13, color: theme.textPrimary, fontWeight: '500' },
  contaTipo: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  contaSaldo: { fontSize: 14, fontWeight: '700' },
  contaLimite: { fontSize: 10, color: theme.textMuted, marginTop: 2 },

  connAcoes: {
    flexDirection: 'row', gap: 8, padding: 12,
  },
  btnAcao: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  btnAcaoText: { fontSize: 13, fontWeight: '600' },
})