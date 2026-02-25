/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
  siteName: string
  siteUrl: string
  recipient: string
}

const logoUrl = 'https://kneaniaifzgqibpajyji.supabase.co/storage/v1/object/public/email-assets/logo-rxfin-full.png?v=1'

export const ReauthenticationEmail = ({
  token,
  siteName = 'RXFin',
  siteUrl = 'https://app.rxfin.com.br',
  recipient,
}: ReauthenticationEmailProps) => (
  <Html>
    <Head />
    <Preview>Código de verificação — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={logoUrl} alt="RXFin" width="140" style={{ display: 'inline-block' }} />
        </Section>
        <Heading style={h1}>Código de verificação 🔐</Heading>
        <Text style={text}>
          Use o código abaixo para confirmar sua identidade no <strong>RXFin</strong>:
        </Text>
        <code style={code}>{token}</code>
        <Hr style={hr} />
        <Text style={footer}>Se você não solicitou este código, ignore este email.</Text>
        <Text style={footerBrand}><Link href={siteUrl} style={footerLink}>RXFin</Link> — Suas finanças sob controle</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }
const logoSection = { textAlign: 'center' as const, marginBottom: '32px' }
const h1 = { color: '#161922', fontSize: '22px', fontWeight: '700', margin: '0 0 20px 0' }
const text = { color: '#52525b', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px 0' }
const code = { display: 'inline-block', padding: '16px 4.5%', width: '90.5%', backgroundColor: '#f4f4f4', borderRadius: '5px', border: '1px solid #eee', color: '#161922', fontSize: '28px', letterSpacing: '6px', textAlign: 'center' as const, margin: '16px 0' }
const hr = { borderColor: '#e5e7eb', margin: '28px 0' }
const footer = { color: '#a1a1aa', fontSize: '12px', margin: '0 0 8px 0' }
const footerBrand = { color: '#c4c4c4', fontSize: '11px', textAlign: 'center' as const, margin: '16px 0 0 0' }
const footerLink = { color: '#c4c4c4', textDecoration: 'none' }
