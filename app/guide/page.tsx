export default function GuidePage() {
  return (
    <main className="mx-auto max-w-3xl p-8 pb-16">
      <h1 className="text-4xl font-bold mb-6">📖 How to Use ClientVault</h1>

      <div className="space-y-8">
        {/* Freelancer Section */}
        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">For Freelancers 🎨</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Create a Vault</h3>
              <p className="text-slate-600">
                Go to the home page and fill in the "Create New Vault" form. Select a client, set the price, 
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
                Monitor the status of each vault. When a client completes payment, the status changes to "COMPLETED" 
                and they can download the original file.
              </p>
            </div>
          </div>
        </section>

        {/* Client Section */}
        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-2xl font-bold mb-4 text-green-600">For Clients 💼</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Receive an Invitation</h3>
              <p className="text-slate-600">
                A freelancer will create a vault and invite you as a client. You'll see it in the 
                "Vaults Shared With You" section on your home page.
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
                Once you're satisfied with the preview, proceed to checkout and complete the payment through 
                our secure payment processor.
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
        </section>

        {/* Key Features */}
        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">✨ Key Features</h2>
          
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
                <p className="font-semibold">Integrated Payments</p>
                <p className="text-sm text-slate-600">Handle all transactions securely with automatic payment processing</p>
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
        </section>

        {/* FAQ */}
        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">❓ FAQs</h2>
          
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
                Currently, you'll need to create a new vault with the updated price. We're working on 
                edit functionality for future versions.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">Is my payment information secure?</p>
              <p className="text-slate-600 text-sm">
                Yes! We use industry-standard security and partner with trusted payment processors 
                to keep your financial information safe.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
