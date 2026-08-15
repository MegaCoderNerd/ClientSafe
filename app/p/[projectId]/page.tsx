import { AssetImage } from "@/components/asset-image";
import { Chat } from "@/components/chat";
import { DownloadOriginalLink } from "@/components/download-original-link";
import { PayButton } from "@/app/p/[projectId]/pay-button";
import { authOptions } from "@/lib/auth";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
    params: Promise<{
        projectId: string;
    }>;
};

export default async function ClientPreviewPage({ params }: Props) {
    const { projectId } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
        notFound();
    }

    // שולף את נתוני הפרויקט, כולל נתוני הפרילנסר ונתוני הלקוח כדי שנוכל להציג את השם בצ'אט
    const { data: projectData, error } = await supabase
        .from("DeliveryProject")
        .select("id, title, description, price, currency, paymentStatus, freelancerId, freelancer:User!freelancerId(name), client:User!clientId(name), asset:Asset(id, previewUrl, isUnlocked)")
        .eq("id", projectId)
        .single();

    if (error || !projectData) {
        notFound();
    }

    // נרמול הנתונים שחוזרים מ-Supabase
    const assetData = Array.isArray(projectData.asset) ? projectData.asset[0] : projectData.asset;
    const freelancerData = Array.isArray(projectData.freelancer) ? projectData.freelancer[0] : projectData.freelancer;
    const clientData = Array.isArray(projectData.client) ? projectData.client[0] : projectData.client;

    if (!assetData) {
        notFound();
    }

    const previewUrl = getPreviewAssetUrl(assetData.previewUrl);
    const protectedDownloadUrl = createProtectedDownloadLink(assetData.id);

    const isVaultOwner = currentUserId === projectData.freelancerId;

    // הגדרת שם המשתמש השני עבור הצ'אט
    const otherUserName = isVaultOwner ? clientData?.name : freelancerData?.name;

    return (
        <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
                <span className="mr-2">←</span> Back to Dashboard
            </Link>

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold">{projectData.title}</h1>
                <p className="mt-2 text-slate-700">{projectData.description}</p>
                <p className="mt-4 text-sm text-slate-600">Freelancer: {freelancerData?.name}</p>
                <p className="text-sm text-slate-600">Price: {(projectData.price / 100).toFixed(2)} {projectData.currency.toUpperCase()}</p>
                {isVaultOwner && <p className="text-sm text-slate-600">Payment Status: {projectData.paymentStatus}</p>}
            </section>

            {isVaultOwner || projectData.paymentStatus === "COMPLETED" ? (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Asset Preview</h2>
                    <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border bg-slate-100">
                        <AssetImage
                            src={previewUrl}
                            alt={`${projectData.title} preview`}
                            sizes="(max-width: 896px) 100vw, 896px"
                            preload
                        />
                    </div>
                </section>
            ) : (
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Asset Preview</h2>
                    <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border bg-slate-100">
                        <AssetImage
                            src={previewUrl}
                            alt={`${projectData.title} preview`}
                            sizes="(max-width: 896px) 100vw, 896px"
                            preload
                        />
                    </div>
                    <p className="mt-4 text-sm text-slate-600 italic">This is a watermarked preview. Purchase to download the full version.</p>
                </section>
            )}

            <section className="rounded-xl border bg-white p-6 shadow-sm">
                {isVaultOwner ? (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">This is your vault. Download your original asset:</p>
                        <DownloadOriginalLink href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                            Download Original Asset
                        </DownloadOriginalLink>
                    </div>
                ) : projectData.paymentStatus === "COMPLETED" && assetData.isUnlocked ? (
                    <DownloadOriginalLink href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                        Download Original Asset
                    </DownloadOriginalLink>
                ) : (
                    <PayButton projectId={projectData.id} />
                )}
            </section>

            {/* רכיב הצ'אט המעודכן */}
            <Chat
                projectId={projectData.id}
                currentUserId={currentUserId}
                otherUserName={otherUserName || "User"}
            />
        </main>
    );
}