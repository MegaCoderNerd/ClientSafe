import { Chat } from "@/components/chat";
import { DeleteVaultButton } from "@/components/delete-vault-button";
import { DownloadOriginalLink } from "@/components/download-original-link";
import { SupabaseLiveRefresh } from "@/components/supabase-live-refresh";
import { VaultPreviewStage } from "@/components/vault-preview-stage";
import { PayButton } from "@/app/p/[projectId]/pay-button";
import { PayPalReturnHandler } from "@/app/p/[projectId]/paypal-return-handler";
import { authOptions } from "@/lib/auth";
import { withDemoAccessToken } from "@/lib/demo-access";
import { feesForStoredVault, getPayPalMode, paypalCaptureUserMessage } from "@/lib/paypal";
import { firstQueryValue } from "@/lib/search-params";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { fetchDeliveryProjectById } from "@/lib/delivery-project";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{
        projectId: string;
    }>;
    searchParams: Promise<{
        token?: string | string[];
        canceled?: string | string[];
        payError?: string | string[];
    }>;
};

export default async function ClientPreviewPage({ params, searchParams }: Props) {
    const { projectId } = await params;
    const query = await searchParams;
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    const checkoutCanceled = firstQueryValue(query.canceled) === "true";
    const paypalToken = checkoutCanceled ? undefined : firstQueryValue(query.token);
    const payError = firstQueryValue(query.payError);
    const payErrorMessage = payError ? paypalCaptureUserMessage(payError) : null;
    const sandboxCheckout = getPayPalMode() === "sandbox";

    if (!currentUserId) {
        redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/p/${projectId}`)}`);
    }

    // שולף את נתוני הפרויקט, כולל נתוני הפרילנסר ונתוני הלקוח כדי שנוכל להציג את השם בצ'אט
    const vaultSelect =
        "id, title, description, price, currency, paymentStatus, freelancerId, clientId, platformFeePercent, platformFeeAmount, freelancerPayoutAmount, freelancer:User!freelancerId(name), client:User!clientId(name), asset:Asset(id, previewUrl, previewVideoUrl, demoIndexUrl, isUnlocked)";
    const { data: projectData, error } = await fetchDeliveryProjectById(
        projectId,
        `id, title, description, price, currency, paymentStatus, freelancerId, clientId, checkoutStartedAt, platformFeePercent, platformFeeAmount, freelancerPayoutAmount, freelancer:User!freelancerId(name), client:User!clientId(name), asset:Asset(id, previewUrl, previewVideoUrl, demoIndexUrl, isUnlocked)`,
        vaultSelect,
    );

    if (error || !projectData) {
        notFound();
    }

    const isVaultOwner = currentUserId === projectData.freelancerId;
    const isAssignedClient = currentUserId === projectData.clientId;
    if (!isVaultOwner && !isAssignedClient) {
        notFound();
    }

    // נרמול הנתונים שחוזרים מ-Supabase
    const assetData = Array.isArray(projectData.asset) ? projectData.asset[0] : projectData.asset;
    const freelancerData = Array.isArray(projectData.freelancer) ? projectData.freelancer[0] : projectData.freelancer;
    const clientData = Array.isArray(projectData.client) ? projectData.client[0] : projectData.client;

    if (!assetData) {
        notFound();
    }

    const previewUrl = assetData.previewUrl ? getPreviewAssetUrl(assetData.previewUrl) : null;
    const isFallbackPoster = typeof assetData.previewUrl === "string" && assetData.previewUrl.includes("video-poster.svg");
    const imageSrc = previewUrl && !isFallbackPoster ? previewUrl : null;
    const videoSrc = assetData.previewVideoUrl || null;
    const demoSrc = assetData.demoIndexUrl
      ? withDemoAccessToken(assetData.demoIndexUrl, assetData.id)
      : null;
    const protectedDownloadUrl = createProtectedDownloadLink(assetData.id);

    const fees = feesForStoredVault(projectData);
    const platformFeeAmount = fees.platformFeeAmount;
    const freelancerPayoutAmount = fees.freelancerPayoutAmount;

    // הגדרת שם המשתמש השני עבור הצ'אט
    const otherUserName = isVaultOwner ? clientData?.name : freelancerData?.name;

    return (
        <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
            <SupabaseLiveRefresh
                tables={[
                    { table: "DeliveryProject", filter: `id=eq.${projectId}` },
                    { table: "Asset", filter: `projectId=eq.${projectId}` },
                ]}
            />
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                <span className="mr-2">←</span> Back to Dashboard
            </Link>

            <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="flex min-w-0 flex-col gap-6">
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <h1 className="text-2xl font-semibold">{projectData.title}</h1>
                            {isVaultOwner && projectData.paymentStatus === "PENDING" ? (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex flex-wrap items-start gap-2">
                                    <Link href={`/p/${projectData.id}/edit`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
                                        Edit vault
                                    </Link>
                                    <DeleteVaultButton
                                        projectId={projectData.id}
                                        paymentStatus={projectData.paymentStatus}
                                        checkoutStartedAt={projectData.checkoutStartedAt}
                                    />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <p className="mt-2 text-slate-700">{projectData.description}</p>
                        <p className="mt-4 text-sm text-slate-600">Freelancer: {freelancerData?.name}</p>
                        <p className="text-sm text-slate-600">Price: {(projectData.price / 100).toFixed(2)} {projectData.currency.toUpperCase()}</p>
                        {isVaultOwner && <p className="text-sm text-slate-600">Payment Status: {projectData.paymentStatus}</p>}
                        {isVaultOwner && (
                            <p className="text-sm text-slate-600">
                                Payout: {(freelancerPayoutAmount / 100).toFixed(2)} {projectData.currency.toUpperCase()}
                                {" "}({100 - fees.platformFeePercent}%) after a {fees.platformFeePercent}% platform fee
                                {" "}({(platformFeeAmount / 100).toFixed(2)} {projectData.currency.toUpperCase()}).
                            </p>
                        )}
                    </section>

                    <VaultPreviewStage
                        projectId={projectData.id}
                        title={projectData.title}
                        imageSrc={imageSrc}
                        videoSrc={videoSrc}
                        posterSrc={previewUrl}
                        demoSrc={demoSrc}
                        isOwner={isVaultOwner}
                        isPaid={projectData.paymentStatus === "COMPLETED"}
                    />

                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        {isVaultOwner ? (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600">This is your vault. Download your original asset:</p>
                                <DownloadOriginalLink href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                                    Download Original Asset
                                </DownloadOriginalLink>
                            </div>
                        ) : projectData.paymentStatus === "COMPLETED" ? (
                            <DownloadOriginalLink href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                                Download Original Asset
                            </DownloadOriginalLink>
                        ) : (
                            <div>
                                {checkoutCanceled ? (
                                    <p className="mb-3 text-sm text-amber-700">PayPal checkout was canceled. You can try again when you are ready.</p>
                                ) : null}
                                {payErrorMessage && !paypalToken ? (
                                    <p className="mb-3 text-sm text-red-600">{payErrorMessage}</p>
                                ) : null}
                                {paypalToken ? (
                                    <PayPalReturnHandler projectId={projectData.id} token={paypalToken} />
                                ) : (
                                    <PayButton
                                        projectId={projectData.id}
                                        priceCents={projectData.price}
                                        currency={projectData.currency}
                                        platformFeePercent={fees.platformFeePercent}
                                        platformFeeAmount={platformFeeAmount}
                                        freelancerPayoutAmount={freelancerPayoutAmount}
                                        sandboxMode={sandboxCheckout}
                                    />
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="min-w-0 lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]">
                    <Chat
                        projectId={projectData.id}
                        currentUserId={currentUserId}
                        otherUserName={otherUserName || "User"}
                    />
                </aside>
            </div>
        </main>
    );
}