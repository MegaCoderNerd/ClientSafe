import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl p-8 pb-16">
      <Link href="/dashboard" className="mb-6 inline-flex items-center text-accent hover:text-accent-hover">
        <span className="mr-2">←</span> Back to Dashboard
      </Link>
      <h1 className="mb-6 font-display text-4xl font-semibold">How to Use ClientVault</h1>

      <div className="space-y-8">
        {/* Freelancer Section */}
        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-bold text-accent">For Freelancers</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Create a Vault</h3>
              <p className="text-slate-600">
                Open the Create tab on your dashboard and fill in the "Create New Vault" form. Enter the client email, set the price, 
                add a title and description, and provide URLs for both the watermarked preview and original file.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. Share the Preview Link</h3>
              <p className="text-slate-600">
                Once created, your vault will appear in the "Your Vaults" section. Share the preview link with your client 
                so they can see the watermarked version before purchasing.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. Track Payments</h3>
              <p className="text-slate-600">
                Monitor the status of each vault. When a client completes PayPal payment, the status changes to &quot;COMPLETED&quot;
                and they can download the original file. You receive 90% of the listed price; ClientVault ledgers a 10% platform fee
                (PayPal&apos;s processing fee comes out of the platform share).
              </p>
            </div>
          </div>
        </Card>

        {/* Client Section */}
        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-bold text-emerald-600">For Clients</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Receive an Invitation</h3>
              <p className="text-slate-600">
                A freelancer will create a vault and invite you as a client. You'll see it in the 
                "Vaults Shared With You" tab on your dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. Preview Before Purchasing</h3>
              <p className="text-slate-600">
                Click on the vault to view the watermarked preview. This allows you to see exactly what 
                you're purchasing before making any payment.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. Complete Payment</h3>
              <p className="text-slate-600">
                Once you&apos;re satisfied with the preview, pay the listed vault price on PayPal&apos;s hosted checkout.
                Card details stay with PayPal. ClientVault takes a 10% platform fee and the freelancer receives 90%.
                The vault unlocks only after PayPal confirms the capture.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">4. Download Your Asset</h3>
              <p className="text-slate-600">
                After payment is confirmed, you'll have immediate access to download the original, 
                full-quality file from the vault.
              </p>
            </div>
          </div>
        </Card>

        {/* Key Features */}
        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-bold">Key Features</h2>
          
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-semibold">Secure Preview Links</p>
                <p className="text-sm text-slate-600">Share watermarked previews safely with clients before they pay</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">💳</span>
              <div>
                <p className="font-semibold">PayPal Checkout</p>
                <p className="text-sm text-slate-600">Clients pay on PayPal. A 10% platform fee is recorded, and the original file unlocks only after a verified capture.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">📦</span>
              <div>
                <p className="font-semibold">Organized Vaults</p>
                <p className="text-sm text-slate-600">Manage multiple deliveries in one unified dashboard</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">🎯</span>
              <div>
                <p className="font-semibold">Clear Separation</p>
                <p className="text-sm text-slate-600">Easily distinguish between vaults you created and ones you're purchasing</p>
              </div>
            </li>
          </ul>
        </Card>

        {/* FAQ */}
        <Card className="p-6">
          <h2 className="mb-4 text-2xl font-bold">FAQs</h2>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold mb-2">What's a watermarked preview?</p>
              <p className="text-slate-600 text-sm">
                A watermarked preview is a version of your asset that has visible watermarks or other 
                protections to prevent unauthorized use before purchase.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Can I change the price after creating a vault?</p>
              <p className="text-slate-600 text-sm">
                Currently, unpaid vaults can be edited from the dashboard or the vault page. Paid vaults stay locked.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Is my payment information secure?</p>
              <p className="text-slate-600 text-sm">
                Yes. Checkout happens on PayPal&apos;s hosted page, so card numbers never touch ClientVault servers.
                We only unlock a vault after PayPal verifies the payment capture.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">How is the 10% platform fee handled?</p>
              <p className="text-slate-600 text-sm">
                The client pays the listed vault price in full. ClientVault records 10% as the platform fee and 90% as the freelancer payout.
                Paying the freelancer out of that 90% is done from the dashboard later; it is not split automatically at checkout.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
