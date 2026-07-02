import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe('YOUR_STRIPE_SECRET_KEY');

const plans = [
  // INDIVIDUAL
  { id: 'individual_youtube_personal', name: 'YouTube Creator / Podcaster - Personal Coverage Only', monthly: 2999, yearly: 32989 },
  { id: 'individual_youtube_client', name: 'YouTube Creator / Podcaster - Add Coverage for Client Work', monthly: 9999, yearly: 109989 },
  { id: 'individual_wedding_only', name: 'Wedding Filmmaker - Wedding Clients Only', monthly: 7999, yearly: 87989 },
  { id: 'individual_wedding_commercial', name: 'Wedding Filmmaker - Wedding & Commercial Clients', monthly: 9999, yearly: 109989 },
  { id: 'individual_freelance_all', name: 'Freelance Filmmaker - All-Access', monthly: 9999, yearly: 109989 },
  { id: 'individual_supervisor_small', name: 'Music Supervisor - Small Client (0-100)', monthly: 9999, yearly: 109989 },
  { id: 'individual_supervisor_medium', name: 'Music Supervisor - Medium Client (101-250)', monthly: 19999, yearly: 219989 },
  
  // BUSINESS
  { id: 'business_small', name: 'Business - Small Client (0-100 employees)', monthly: 9999, yearly: 109989 },
  { id: 'business_medium', name: 'Business - Medium Client (101-250 employees)', monthly: 19999, yearly: 219989 }
];

async function run() {
  console.log('-- SQL STATEMENTS FOR SUPABASE --');
  
  for (const plan of plans) {
    // 1. Create Product
    const product = await stripe.products.create({
      name: plan.name,
    });
    
    // 2. Create Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    
    // 3. Create Yearly Price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearly,
      currency: 'usd',
      recurring: { interval: 'year' },
    });

    console.log(`INSERT INTO public.subscription_plans (id, stripe_product_id, stripe_price_id) VALUES ('${plan.id}_monthly', '${product.id}', '${monthlyPrice.id}');`);
    console.log(`INSERT INTO public.subscription_plans (id, stripe_product_id, stripe_price_id) VALUES ('${plan.id}_yearly', '${product.id}', '${yearlyPrice.id}');`);
  }
}

run().catch(console.error);
