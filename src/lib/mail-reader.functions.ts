import { createServerFn } from '@tanstack/react-start'
import { readMailbox, type MailInput } from './mail-reader.server'

export const readMails = createServerFn({ method: 'POST' })
  .inputValidator((data: MailInput) => {
    if (!data?.email || !data?.refresh_token || !data?.client_id) {
      throw new Error('email, refresh_token and client_id are required')
    }
    return data
  })
  .handler(async ({ data }) => readMailbox(data))