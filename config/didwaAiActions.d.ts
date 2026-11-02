export type DidwaAiActionId =
  | '[PARSE_WHATSAPP_ORDER]'
  | '[GENERATE_PRODUCT_COPY]'
  | '[CHECK_MOMO_BALANCE]'
  | '[REQUEST_PAYOUT]'
  | '[INVENTORY_INSIGHTS]'
  | '[SALES_SUMMARY]'
  | '[ORDER_SUMMARY]';

export interface DidwaAiAction {
  id: DidwaAiActionId;
  label: string;
  description: string;
  payloadSchema: {
    type: 'object';
    properties: Record<string, {
      type: 'string' | 'number';
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      format?: 'uuid';
      minimum?: number;
      maximum?: number;
    }>;
    additionalProperties: false;
  };
}

export const AI_SUPPORT_FALLBACK: string;
export function createAiSupportNotice(contact?: {
  supportEmail?: string;
  supportPhone?: string;
  whatsappNumber?: string;
}): string;
export function isSupportedOrderText(value: unknown): boolean;
export const AI_ACTIONS: readonly DidwaAiAction[];
export const AI_ACTION_BY_ID: Map<DidwaAiActionId, DidwaAiAction>;
