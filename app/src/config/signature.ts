export const PACKAGE_ID = 'ink.popr.shiopa'
export const BRAND = 'shiopa'
export const APP_SIGNATURE_UUID = 'a7f3c9e2-4b1d-8e6a-9c2f-5d8b1a0e3f47'
export const BUILD_FINGERPRINT = '3f8afa50fe5a0caf'
export const APP_SIGNATURE = `${APP_SIGNATURE_UUID}.${BUILD_FINGERPRINT}`
export const SHIOPA_CODE = 'f3f3f22b17c4'

export const SIG_HEADER = 'x-shiopa-sig'
export const SIG_QUERY = 'sig'
export const CODE_HEADER = 'x-shiopa-code'
export const CODE_QUERY = 'scode'
export const CODE_PARAM = 'shiopaCode'

export function signatureHeaders(): Record<string, string> {
  return {
    [SIG_HEADER]: APP_SIGNATURE,
    [CODE_HEADER]: SHIOPA_CODE,
  }
}

export function signatureQuery(): Record<string, string> {
  return {
    [SIG_QUERY]: APP_SIGNATURE,
    [CODE_QUERY]: SHIOPA_CODE,
    [CODE_PARAM]: SHIOPA_CODE,
  }
}

export const signature = {
  APP_SIGNATURE,
  BUILD_FINGERPRINT,
  SHIOPA_CODE,
  PACKAGE_ID,
  BRAND,
  headers: signatureHeaders,
  query: signatureQuery,
}

export default signature
