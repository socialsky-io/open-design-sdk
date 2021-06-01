import { ok } from 'assert'
import { postToken } from './post-token'

import { OpenDesignApi } from '@opendesign/api'

export async function createOpenDesignApi(
  params: { token?: string | null } = {}
): Promise<{
  openDesignApi: OpenDesignApi
  apiRoot: string
  token: string
}> {
  const apiRoot = process.env['OPEN_DESIGN_API_URL_ROOT']
  ok(apiRoot)

  const token = params.token || (await getToken({ apiRoot }))

  return {
    openDesignApi: new OpenDesignApi({
      apiRoot,
      token,
    }),
    apiRoot,
    token,
  }
}

function getToken({ apiRoot }: { apiRoot: string }) {
  const email = process.env['OPEN_DESIGN_API_USER_EMAIL']
  const name = process.env['OPEN_DESIGN_API_USER_NAME']
  ok(email)
  ok(name)

  return postToken({
    apiRoot,
    email,
    name,
  })
}
