// Aviso de pagamento do Mercado Pago: consulta o pagamento e manda para quem é (recarga de créditos ou pedido de BM).
import { mpGetPayment } from "./mercadopago";
import { confirmCreditPayment } from "./credit-purchase";
import { confirmMarketPayment } from "./market";

export async function handlePaymentNotice(paymentId: string) {
  const pay = await mpGetPayment(paymentId);
  if (pay.external_reference?.startsWith("cred:")) return confirmCreditPayment(pay);
  return confirmMarketPayment(pay);
}
