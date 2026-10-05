// Milestone 4: Profile Page
// Manages patient health profile details, allergies, conditions, family history, and medications.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ComprehensiveHealthProfile,
  getComprehensiveProfile,
} from "@/services/profileService";
import { ProfileCompletenessCard } from "@/components/profile/ProfileCompletenessCard";
import { BasicDetailsTab } from "@/components/profile/BasicDetailsTab";
import { HealthHistoryTab } from "@/components/profile/HealthHistoryTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Activity,
  ShieldCheck,
  Loader2,
  Sparkles,
  Heart,
  Lock,
} from "lucide-react";

const Profile: React.FC = () => {
  const { user, isDemo } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [profileData, setProfileData] = useState<ComprehensiveHealthProfile>({
    profile: null,
    allergies: [],
    conditions: [],
    familyHistory: [],
    medications: [],
  });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const full = await getComprehensiveProfile(user.id, isDemo);
        setProfileData(full);
      } catch (err: unknown) {
        toast({
          title: "Failed to load profile",
          description: err instanceof Error ? err.message : "Error retrieving profile.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user, isDemo, toast]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="font-semibold text-foreground text-sm hidden sm:inline">
                Health Companion AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDemo ? (
              <Badge variant="secondary" className="text-2xs bg-amber-100 text-amber-900 border-amber-300">
                Demo Mode (Local Storage)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-2xs text-primary border-primary/30">
                Encrypted & RLS Guarded
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Title & Intro */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Patient Profile & Personalization
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Optional background context to tailor AI consultation advice to your specific lifestyle and health history.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading your health profile...</p>
          </div>
        ) : (
          <>
            {/* Completeness Meter Card */}
            <ProfileCompletenessCard data={profileData} />

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-2 sm:w-80 p-1 rounded-xl bg-muted/60">
                <TabsTrigger value="basic" className="gap-1.5 text-xs rounded-lg">
                  <User className="w-3.5 h-3.5" />
                  <span>Basic Details</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 text-xs rounded-lg">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Health History</span>
                </TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="focus-visible:outline-hidden">
                <BasicDetailsTab
                  userId={user.id}
                  isDemo={isDemo}
                  initialProfile={profileData.profile}
                  onSaved={(updated) =>
                    setProfileData((prev) => ({ ...prev, profile: updated }))
                  }
                />
              </TabsContent>

              {/* Health History Tab */}
              <TabsContent value="history" className="focus-visible:outline-hidden">
                <HealthHistoryTab
                  userId={user.id}
                  isDemo={isDemo}
                  allergies={profileData.allergies}
                  conditions={profileData.conditions}
                  familyHistory={profileData.familyHistory}
                  medications={profileData.medications}
                  onAllergiesChanged={(allergies) =>
                    setProfileData((prev) => ({ ...prev, allergies }))
                  }
                  onConditionsChanged={(conditions) =>
                    setProfileData((prev) => ({ ...prev, conditions }))
                  }
                  onFamilyHistoryChanged={(familyHistory) =>
                    setProfileData((prev) => ({ ...prev, familyHistory }))
                  }
                  onMedicationsChanged={(medications) =>
                    setProfileData((prev) => ({ ...prev, medications }))
                  }
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
