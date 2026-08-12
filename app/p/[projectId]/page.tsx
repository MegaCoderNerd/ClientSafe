import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { PayButton } from "@/app/p/[projectId]/pay-button";
import { Chat } from "@/components/chat";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
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

    const { data: projectData, error } = await supabase
        .from("DeliveryProject")
        .select("*, freelancer:User!freelancerId(*), client:User!clientId(*), asset:Asset(*)")
        .eq("id", projectId)
        .single();

    if (error || !projectData) {
        notFound();
    }

    const assetData = Array.isArray(projectData.asset) ? projectData.asset[0] : projectData.asset;
    const freelancerData = Array.isArray(projectData.freelancer) ? projectData.freelancer[0] : projectData.freelancer;
    const clientData = Array.isArray(projectData.client) ? projectData.client[0] : projectData.client;

    if (!assetData) {
        notFound();
    }

    const previewUrl = getPreviewAssetUrl(assetData.previewUrl);
    const protectedDownloadUrl = createProtectedDownloadLink(assetData.id);

    const isVaultOwner = currentUserId === projectData.freelancerId;
    const otherUserName = isVaultOwner ? clientData?.name : freelancerData?.name;

    return (
        <main className="mx-auto max-w-7xl p-8">
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
                <span className="mr-2">←</span> Back to Dashboard
            </Link>

            {/* מעטפת ה-Grid - שונתה ל-5 עמודות כדי לתת יותר רוחב לצ'אט */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

                {/* עמודה שמאלית - לוקחת 3/5 מהרוחב */}
                <div className="flex flex-col gap-6 lg:col-span-3">
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
                                <Image src={previewUrl} alt={`${projectData.title} preview`} fill className="object-cover" unoptimized />
                            </div>
                        </section>
                    ) : (
                        <section className="rounded-xl border bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-semibold">Asset Preview</h2>
                            <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border bg-slate-100">
                                <Image src={previewUrl} alt={`${projectData.title} preview`} fill className="object-cover" unoptimized />
                            </div>
                            <p className="mt-4 text-sm text-slate-600 italic">This is a watermarked preview. Purchase to download the full version.</p>
                        </section>
                    )}

                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        {isVaultOwner ? (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600">This is your vault. Download your original asset:</p>
                                <Link href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                                    Download Original Asset
                                </Link>
                            </div>
                        ) : projectData.paymentStatus === "COMPLETED" && assetData.isUnlocked ? (
                            <Link href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                                Download Original Asset
                            </Link>
                        ) : (
                            <PayButton projectId={projectData.id} />
                        )}
                    </section>
                </div>

                {/* עמודה ימנית (הצ'אט) - לוקחת 2/5 מהרוחב */}
                <div className="lg:col-span-2">
                    {/* הוגדר גובה קבוע שמונע מתיחת יתר */}
                    <div className="sticky top-8 h-[800px]">
                        <Chat
                            projectId={projectData.id}
                            currentUserId={currentUserId}
                            otherUserName={otherUserName || "User"}
                        />
                    </div>
                </div>

            </div>
        </main>
    );
}