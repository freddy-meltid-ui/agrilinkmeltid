import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, CheckCircle, Clock, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

type Review = {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
};

type ReputationData = {
  avgRating: number;
  totalReviews: number;
  totalTransactions: number;
  completionRate: number;
  onTimeRate: number;
  reviews: Review[];
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

export const useReputation = (userId: string | undefined) => {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      setLoading(true);

      // Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewed_id", userId)
        .order("created_at", { ascending: false });

      // Fetch reviewer profiles
      const reviewList = reviews || [];
      let enrichedReviews: Review[] = reviewList as Review[];
      if (reviewList.length > 0) {
        const reviewerIds = [...new Set(reviewList.map((r: any) => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reviewerIds);
        const nameMap: Record<string, string> = {};
        profiles?.forEach((p: any) => { nameMap[p.user_id] = p.full_name || ""; });
        enrichedReviews = reviewList.map((r: any) => ({
          ...r,
          reviewer_name: nameMap[r.reviewer_id] || "",
        }));
      }

      // Fetch transactions where user is seller or buyer
      const { data: txSeller } = await supabase
        .from("transactions")
        .select("*")
        .eq("seller_id", userId);
      const { data: txBuyer } = await supabase
        .from("transactions")
        .select("*")
        .eq("buyer_id", userId);
      const allTx = [...(txSeller || []), ...(txBuyer || [])];

      const completed = allTx.filter((t: any) => t.status === "completed");
      const onTime = completed.filter((t: any) => {
        if (!t.due_date || !t.completed_at) return true;
        return new Date(t.completed_at) <= new Date(t.due_date);
      });

      const totalRating = enrichedReviews.reduce((sum, r) => sum + r.rating, 0);

      setData({
        avgRating: enrichedReviews.length > 0 ? totalRating / enrichedReviews.length : 0,
        totalReviews: enrichedReviews.length,
        totalTransactions: allTx.length,
        completionRate: allTx.length > 0 ? (completed.length / allTx.length) * 100 : 0,
        onTimeRate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0,
        reviews: enrichedReviews,
      });
      setLoading(false);
    };
    fetch();
  }, [userId]);

  return { data, loading };
};

const UserReputation = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const { data, loading } = useReputation(userId);

  if (loading) return <div className="text-muted-foreground text-sm">{t("reputation.loading")}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="flex justify-center mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            {data.avgRating > 0 ? data.avgRating.toFixed(1) : "—"}
          </p>
          <p className="text-muted-foreground text-xs mt-1">{t("reputation.avgRating")}</p>
          <p className="text-muted-foreground text-xs">({data.totalReviews} {t("reputation.reviews")})</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="flex justify-center mb-2">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{data.totalTransactions}</p>
          <p className="text-muted-foreground text-xs mt-1">{t("reputation.transactions")}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-primary">{data.completionRate.toFixed(0)}%</p>
          <p className="text-muted-foreground text-xs mt-1">{t("reputation.completionRate")}</p>
          <Progress value={data.completionRate} className="h-1.5 mt-2" />
        </div>

        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="flex justify-center mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-primary">{data.onTimeRate.toFixed(0)}%</p>
          <p className="text-muted-foreground text-xs mt-1">{t("reputation.onTimeDelivery")}</p>
          <Progress value={data.onTimeRate} className="h-1.5 mt-2" />
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h3 className="font-serif text-lg mb-3">{t("reputation.recentReviews")}</h3>
        {data.reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("reputation.noReviews")}</p>
        ) : (
          <div className="space-y-3">
            {data.reviews.slice(0, 10).map((review) => (
              <div key={review.id} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{review.reviewer_name || t("marketplace.anonymous")}</span>
                  <StarRating rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="text-muted-foreground text-sm">{review.comment}</p>
                )}
                <p className="text-muted-foreground text-xs mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserReputation;
