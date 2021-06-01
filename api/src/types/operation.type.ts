import type { Headers } from 'node-fetch'
import type {
  IOperation,
  Parameters,
  RequestBodies,
  RequestBody,
} from './openapi-typescript.type'

export type OperationResponseBodyByStatusCode<Operation extends IOperation> = {
  [StatusCode in OperationStatusCodes<Operation>]: Operation['responses'][StatusCode] extends {
    'application/json': unknown
  }
    ? Operation['responses'][StatusCode]['application/json']
    : Operation['responses'][StatusCode]
}

export type OperationStatusCodes<Operation extends IOperation> = Extract<
  keyof Operation['responses'],
  number
>

export type OperationResponseContentTypes<
  Operation extends IOperation
> = Extract<
  keyof Operation['responses'][OperationStatusCodes<Operation>],
  string
>

export type OperationResponseByStatusCode<Operation extends IOperation> = {
  [StatusCode in OperationStatusCodes<Operation>]: OperationResponseBodyByStatusCode<Operation>[StatusCode] extends never
    ? {
        statusCode: StatusCode
        headers?: Headers
      }
    : {
        statusCode: StatusCode
        headers?: Headers
        body: OperationResponseBodyByStatusCode<Operation>[StatusCode]
      }
}

export type OperationResponse<
  Operation extends IOperation
> = OperationResponseByStatusCode<Operation>[keyof OperationResponseByStatusCode<Operation>]

export type OperationResponsePromise<Operation extends IOperation> = Promise<
  OperationResponse<Operation>
>

export type OperationBodyParams<
  Operation extends IOperation,
  ContentType extends string
> = Operation['requestBody'] extends RequestBodies
  ? Operation['requestBody'][ContentType] extends RequestBody
    ? Operation['requestBody'][ContentType]
    : Record<never, never>
  : Record<never, never>

export type OperationPathParams<
  Operation extends IOperation
> = Operation['parameters'] extends Parameters
  ? Operation['parameters']['path']
  : Record<never, never>

export type OperationParams<
  Operation extends IOperation
> = (Operation['parameters'] extends Parameters
  ? Operation['parameters']['path'] & Operation['parameters']['query']
  : Record<never, never>) &
  OperationBodyParams<Operation, 'application/json'>

export type OperationMultipartBodyParams<
  Operation extends IOperation,
  BinaryFieldName extends
    | keyof OperationBodyParams<Operation, 'multipart/form-data'>
    | null = null
> = Partial<
  BinaryFieldName extends string
    ? Omit<
        OperationBodyParams<Operation, 'multipart/form-data'>,
        BinaryFieldName
      >
    : OperationBodyParams<Operation, 'multipart/form-data'>
>
