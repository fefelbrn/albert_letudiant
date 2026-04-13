import RadarScoreChart from "@/components/RadarScoreChart";
import StudentIdCard from "@/components/StudentIdCard";
import SubjectHeatmap from "@/components/SubjectHeatmap";
import ProfileCta from "@/components/ProfileCta";

const CandidateProfileSection = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 md:gap-6 xl:auto-rows-fr">
        <div className="md:col-span-2 xl:col-span-5">
          <RadarScoreChart />
        </div>
        <div className="md:col-span-1 xl:col-span-4 min-h-[350px]">
          <SubjectHeatmap />
        </div>
        <div className="md:col-span-1 xl:col-span-3">
          <StudentIdCard />
        </div>
      </div>
      <ProfileCta />
    </div>
  );
};

export default CandidateProfileSection;
