/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeProps {
  confirmationUrl: string
  siteName: string
  siteUrl: string
  recipient: string
  newEmail: string
}

const logoUrl = 'https://kneaniaifzgqibpajyji.supabase.co/storage/v1/object/public/email-assets/logo-rxfin-full.png?v=1'

export const EmailChangeEmail = ({
  confirmationUrl,
  siteName = 'RXFin',
  siteUrl = 'https://app.rxfin.com.br',
  recipient,
  newEmail,
}: EmailChangeProps) => (
  <Html>
    <Head />
    <Preview>Confirme a alteração de email — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={logoUrl} alt="RXFin" width="140" style={{ display: 'inline-block' }} />
        </Section>
        <Heading style={h1}>Alteração de email 📧</Heading>
        <Text style={text}>
          Você solicitou a alteração do email da sua conta no <strong>RXFin</strong>.
          {newEmail && <> Novo email: <strong>{newEmail}</strong></>}
        </Text>
        <Text style={text}>Confirme clicando no botão abaixo:</Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>Confirmar alteração</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Se você não solicitou esta alteração, ignore este email.</Text>
        <Text style={footerBrand}><Link href={siteUrl} style={footerLink}>RXFin</Link> — Suas finanças sob controle</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { maxWidth: '500px', margin: '0 auto', padding: '40px 20px' }
const logoSection = { textAlign: 'center' as const, marginBottom: '32px' }
const h1 = { color: '#161922', fontSize: '22px', fontWeight: '700', margin: '0 0 20px 0' }
const text = { color: '#52525b', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px 0' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: 'hsl(145, 63%, 35%)', color: '#ffffff', borderRadius: '8px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '28px 0' }
const footer = { color: '#a1a1aa', fontSize: '12px', margin: '0 0 8px 0' }
const footerBrand = { color: '#c4c4c4', fontSize: '11px', textAlign: 'center' as const, margin: '16px 0 0 0' }
const footerLink = { color: '#c4c4c4', textDecoration: 'none' }
