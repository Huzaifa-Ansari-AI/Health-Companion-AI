// Milestone 4: HealthHistoryTab Component
// Integrates Allergies, Conditions, Family History, and Medication context sections.

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllergiesSection } from "./AllergiesSection";
import { ConditionsSection } from "./ConditionsSection";
import { FamilyHistorySection } from "./FamilyHistorySection";
import { MedicationsSection } from "./MedicationsSection";
import {
  ProfileAllergy,
  ProfileCondition,
  ProfileFamilyHistory,
  ProfileMedication,
} from "@/types/profile";
import { Activity, ShieldAlert, HeartHandshake, Pill } from "lucide-react";

interface HealthHistoryTabProps {
  userId: string;
  isDemo: boolean;
  allergies: ProfileAllergy[];
  conditions: ProfileCondition[];
  familyHistory: ProfileFamilyHistory[];
  medications: ProfileMedication[];
  onAllergiesChanged: (updated: ProfileAllergy[]) => void;
  onConditionsChanged: (updated: ProfileCondition[]) => void;
  onFamilyHistoryChanged: (updated: ProfileFamilyHistory[]) => void;
  onMedicationsChanged: (updated: ProfileMedication[]) => void;
}

export const HealthHistoryTab: React.FC<HealthHistoryTabProps> = ({
  userId,
  isDemo,
  allergies,
  conditions,
  familyHistory,
  medications,
  onAllergiesChanged,
  onConditionsChanged,
  onFamilyHistoryChanged,
  onMedicationsChanged,
}) => {
  return (
    <Card className="rounded-2xl border-border/80 shadow-2xs">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-lg">Health History & Context</CardTitle>
            <CardDescription className="text-xs">
              Manage personal health background factors. Everything here is strictly optional and under your control.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allergies" className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 rounded-xl bg-muted/60">
            <TabsTrigger value="allergies" className="text-xs py-2 gap-1.5 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Allergies ({allergies.length})</span>
            </TabsTrigger>
            <TabsTrigger value="conditions" className="text-xs py-2 gap-1.5 rounded-lg">
              <Activity className="w-3.5 h-3.5" />
              <span>Conditions ({conditions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="text-xs py-2 gap-1.5 rounded-lg">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Family ({familyHistory.length})</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="text-xs py-2 gap-1.5 rounded-lg">
              <Pill className="w-3.5 h-3.5" />
              <span>Meds ({medications.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allergies" className="pt-2 focus-visible:outline-hidden">
            <AllergiesSection
              userId={userId}
              isDemo={isDemo}
              allergies={allergies}
              onChanged={onAllergiesChanged}
            />
          </TabsContent>

          <TabsContent value="conditions" className="pt-2 focus-visible:outline-hidden">
            <ConditionsSection
              userId={userId}
              isDemo={isDemo}
              conditions={conditions}
              onChanged={onConditionsChanged}
            />
          </TabsContent>

          <TabsContent value="family" className="pt-2 focus-visible:outline-hidden">
            <FamilyHistorySection
              userId={userId}
              isDemo={isDemo}
              familyHistory={familyHistory}
              onChanged={onFamilyHistoryChanged}
            />
          </TabsContent>

          <TabsContent value="medications" className="pt-2 focus-visible:outline-hidden">
            <MedicationsSection
              userId={userId}
              isDemo={isDemo}
              medications={medications}
              onChanged={onMedicationsChanged}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
