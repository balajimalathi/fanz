import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { customers, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/env';

// Helper to getting Dodo Customer
async function getDodoCustomer(customerId: string) {
  const baseUrl = env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com';

  const res = await fetch(`${baseUrl}/customers/${customerId}`, {
    headers: {
      'Authorization': `Bearer ${env.DODO_PAYMENTS_API_KEY}`
    }
  });

  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    // console.log('Dodo Webhook:', JSON.stringify(payload, null, 2));

    const { type, data } = payload;

    if (type === 'subscription.created' || type === 'subscription.updated' || type === 'subscription.active' || type === 'license_key.created') {
      let customerId = data.customer_id;

      // In some payloads (like subscription.active), customer_id is inside the customer object
      if (!customerId && data.customer && data.customer.customer_id) {
        customerId = data.customer.customer_id;
      }

      if (!customerId) {
        console.error('No customer ID found in payload');
        return NextResponse.json({ error: 'No customer ID' }, { status: 400 });
      }

      // Check if we have the customer
      let [customer] = await db.select().from(customers).where(eq(customers.dodoCustomerId, customerId));

      if (!customer) {
        // Try finding by email if we have user object in payload (subscription events)
        if (data.customer && data.customer.email) {
          [customer] = await db.select().from(customers).where(eq(customers.email, data.customer.email));
        }
      }

      if (!customer) {
        // Still no customer? We need to fetch details if we don't have them in payload
        let email = data.customer?.email;
        let name = data.customer?.name;

        if (!email) {
          const dodoCustomer = await getDodoCustomer(customerId);
          if (dodoCustomer) {
            email = dodoCustomer.email;
            name = dodoCustomer.name;
          }
        }

        if (email) {
          // Check existence again using email found from API
          [customer] = await db.select().from(customers).where(eq(customers.email, email));

          if (!customer) {
            [customer] = await db.insert(customers).values({
              email,
              name,
              dodoCustomerId: customerId
            }).returning();
          } else {
            // Update dodo ID if missing
            if (!customer.dodoCustomerId) {
              await db.update(customers)
                .set({ dodoCustomerId: customerId })
                .where(eq(customers.id, customer.id));
            }
          }
        } else {
          console.error('Could not find customer email for ID:', customerId);
          return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
        }
      }

      // Upsert subscription / license
      // Map fields based on event type
      const isLicense = type === 'license_key.created';

      const planId = data.product_id;
      const status = data.status || 'active';
      // For license, we use license ID as subscription ID for uniqueness
      const dodoId = isLicense ? data.id : data.subscription_id;

      // Dates
      let start = data.created_at ? new Date(data.created_at) : undefined;
      let end = data.next_billing_date ? new Date(data.next_billing_date) : undefined;

      if (isLicense) {
        // Licenses might be lifetime (no end) or have expires_at
        if (data.expires_at) end = new Date(data.expires_at);
        else end = undefined; // Lifetime
      }

      await db.insert(subscriptions).values({
        customerId: customer.id,
        planId,
        status,
        dodoSubscriptionId: dodoId,
        licenseKey: isLicense ? data.key : null,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      }).onConflictDoUpdate({
        target: subscriptions.dodoSubscriptionId,
        set: {
          status,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          updatedAt: new Date(),
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
