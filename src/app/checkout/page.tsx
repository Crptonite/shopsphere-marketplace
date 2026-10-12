import { redirect } from 'next/navigation';

// Checkout starts from the cart (POST /api/checkout → Stripe-hosted page).
export default function CheckoutPage() {
  redirect('/cart');
}
