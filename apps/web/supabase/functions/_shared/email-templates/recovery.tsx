/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  confirmationUrl: string
  siteName: string
  siteUrl: string
  recipient: string
  token: string
}

const logoUrl = 'https://kneaniaifzgqibpajyji.supabase.co/storage/v1/object/public/email-assets/logo-rxfin-full.png?v=1'

export const RecoveryEmail = ({
  confirmationUrl,
  siteName = 'RXFin',
  siteUrl = 'https://app.rxfin.com.br',
  recipient,
  token,
}: RecoveryEmailProps) => (
  <Html>
    <Head />
    <Preview>Redefinir senha — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={logoUrl} alt="RXFin" width="140" style={{ display: 'inline-block' }} />
        </Section>
        <Heading style={h1}>Redefinir sua senha 🔑</Heading>
        <Text style={text}>
          Recebemos uma solicitação para redefinir a senha da sua conta no <strong>RXFin</strong>.
        </Text>
        <Text style={text}>Clique no botão abaixo para criar uma nova senha:</Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>Redefinir senha</Button>
        </Section>
        {token && (
          <>
            <Text style={textMuted}>Ou use este código:</Text>
            <code style={code}>{token}</code>
          </>
        )}
        <Hr style={hr} />
        <Text style={footer}>Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</Text>
        <Text style={footerBrand}><Link href={siteUrl} style={footerLink}>RXFin</Link> — Suas finanças sob controle</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }
const logoSection = { textAlign: 'center' as const, marginBottom: '32px' }
const h1 = { color: '#161922', fontSize: '22px', fontWeight: '700', margin: '0 0 20px 0' }
const text = { color: '#52525b', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px 0' }
const textMuted = { color: '#a1a1aa', fontSize: '13px', margin: '24px 0 8px 0' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: 'hsl(145, 63%, 35%)', color: '#ffffff', borderRadius: '8px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const code = { display: 'inline-block', padding: '16px 4.5%', width: '90.5%', backgroundColor: '#f4f4f4', borderRadius: '5px', border: '1px solid #eee', color: '#161922', fontSize: '24px', letterSpacing: '4px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '28px 0' }
const footer = { color: '#a1a1aa', fontSize: '12px', margin: '0 0 8px 0' }
const footerBrand = { color: '#c4c4c4', fontSize: '11px', textAlign: 'center' as const, margin: '16px 0 0 0' }
const footerLink = { color: '#c4c4c4', textDecoration: 'none' }
