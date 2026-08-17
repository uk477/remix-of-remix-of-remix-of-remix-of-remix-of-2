export type MailInput = {
  email: string
  refresh_token: string
  client_id: string
  folder?: 'inbox' | 'junkemail'
  top?: number
}

export type MailMessage = {
  id: string
  subject: string
  from: string
  preview: string
  received: string
  body_html: string | null
  body_text: string | null
}

export type ReadMailResult = {
  messages: MailMessage[]
  account: string
  error: string | null
}

type TokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

function friendlyTokenError(response: TokenResponse): string {
  const detail = response.error_description ?? response.error ?? ''

  if (detail.includes('AADSTS9002313')) {
    return 'This refresh token is malformed. Demo tokens only test autofill and cannot open a mailbox.'
  }
  if (detail.includes('AADSTS70000') || detail.includes('invalid_grant')) {
    return 'This refresh token is expired, revoked, or was issued for a different Client ID.'
  }
  if (detail.includes('AADSTS700016') || detail.includes('unauthorized_client')) {
    return 'This Client ID is not valid for the supplied refresh token.'
  }

  return 'Microsoft could not authorize these mailbox credentials.'
}

async function exchangeToken(refreshToken: string, clientId: string): Promise<string> {
  const tenants = ['consumers', 'common']
  let lastResponse: TokenResponse = {}

  for (const tenant of tenants) {
    // Do not send a new scope here. A refresh request reuses the scopes granted
    // with the original token; requesting unrelated scopes can make valid seller
    // tokens fail as malformed or invalid_grant.
    const body = new URLSearchParams({
      client_id: clientId.trim(),
      refresh_token: refreshToken.trim(),
      grant_type: 'refresh_token',
    })
    const response = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      },
    )
    const payload = (await response.json()) as TokenResponse
    if (response.ok && payload.access_token) return payload.access_token
    lastResponse = payload
  }

  throw new Error(friendlyTokenError(lastResponse))
}

export async function readMailbox(data: MailInput): Promise<ReadMailResult> {
  try {
    const access = await exchangeToken(data.refresh_token, data.client_id)
    const folder = data.folder === 'junkemail' ? 'JunkEmail' : 'Inbox'
    const top = Math.max(1, Math.min(data.top ?? 25, 50))
    const url =
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages` +
      `?$top=${top}&$select=id,subject,from,bodyPreview,receivedDateTime,body`
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${access}` },
    })

    if (!response.ok) {
      return {
        account: data.email,
        messages: [],
        error: `Microsoft Mail API returned error ${response.status}.`,
      }
    }

    const payload = (await response.json()) as {
      value: Array<{
        id: string
        subject: string | null
        from?: { emailAddress?: { address?: string; name?: string } }
        bodyPreview: string | null
        receivedDateTime: string
        body?: { contentType: 'html' | 'text'; content: string }
      }>
    }

    return {
      account: data.email,
      error: null,
      messages: payload.value.map((message) => ({
        id: message.id,
        subject: message.subject ?? '(no subject)',
        from:
          message.from?.emailAddress?.address ??
          message.from?.emailAddress?.name ??
          '(unknown)',
        preview: message.bodyPreview ?? '',
        received: message.receivedDateTime,
        body_html: message.body?.contentType === 'html' ? message.body.content : null,
        body_text: message.body?.contentType === 'text' ? message.body.content : null,
      })),
    }
  } catch (error) {
    return {
      account: data.email,
      messages: [],
      error: error instanceof Error ? error.message : 'Could not connect to this mailbox.',
    }
  }
}