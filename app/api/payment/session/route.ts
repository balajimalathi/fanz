import { NextResponse } from 'next/server'
import { env } from '@/env';

const PRODUCT_IDS: Record<string, string> = {
  starter: env.DODO_STARTER_PRODUCT_ID,
  professional: env.DODO_PRO_PRODUCT_ID,
  lifetime: env.DODO_LIFETIME_PRODUCT_ID
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan } = body;

    const productId = PRODUCT_IDS[plan?.toLowerCase()];
    if (!productId) {
      return NextResponse.json(
        { error: 'INVALID_PLAN', message: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    const dodoCheckoutUrl = env.DODO_PAYMENTS_ENVIRONMENT ===
      "test_mode" ? "https://test.checkout.dodopayments.com" : "https://checkout.dodopayments.com";

    const payment_link = `${dodoCheckoutUrl}/buy/${productId}?quantity=1&redirect_url=${env.DODO_PAYMENTS_RETURN_URL}`

    // // Call Dodo Payments API directly
    // // Assuming endpoint structure based on search results
    // const response = await fetch('https://test.dodopayments.com/checkout', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${env.DODO_PAYMENTS_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     product_id: productId,
    //     return_url: env.DODO_PAYMENTS_RETURN_URL,
    //     payment_link: true // generic flag if needed
    //   })
    // });

    // if (!response.ok) {
    //   const err = await response.text();
    //   console.error('Dodo API Error:', err);
    //   throw new Error('Failed to create checkout session');
    // }

    // const data = await response.json();

    return NextResponse.json({
      paymentUrl: payment_link
    })
  } catch (error) {
    console.error('Payment session error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
