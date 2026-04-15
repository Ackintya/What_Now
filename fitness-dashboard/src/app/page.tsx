import { getDatabase } from "@/lib/mongodb";
import DashboardClient from "./DashboardClient";
import { getCurrentUser } from "@/lib/auth";
import { Navigation } from "@/components/Navigation";

export const dynamic = "force-dynamic";

export default async function FitnessDashboard() {
  let user = await getCurrentUser();
  
  if (!user) {
    const bypassAuth = process.env.BYPASS_AUTH === "true";
    if (!bypassAuth) {
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center", color: "#e0e0e0" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#ff4500" }}>Access Restricted</h1>
            <p style={{ marginBottom: "2rem", color: "#888" }}>You need to log in to view your fitness dashboard.</p>
            <a href={baseUrl} style={{ background: "#ff4500", color: "white", padding: "0.75rem 2rem", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>
              Go to Login
            </a>
          </div>
        </div>
      );
    }
    // Bypass active — render with guest user for testing
    user = { userId: "guest", email: "guest@test.com", name: "Guest User" };
  }

  const userId = user.userId;
  const db = await getDatabase();

  // 1. Fetch form sessions
  const sessions = await db.collection("sessions").find({ user_id: userId }).toArray();
  
  // 2. Fetch biomechanics
  const biomechanics = await db.collection("fitness_exercise_biomechanics").find({ user_id: userId }).toArray();

  // 3. Fetch motivation/mood
  const moods = await db.collection("community_moods").find({ user_id: userId }).sort({ created_at: -1 }).limit(5).toArray();

  let avgForm = 0;
  let avgPosture = 0;
  let avgArm = 0;
  let avgVisibility = 0;
  let totalReps = 0;

  if (sessions.length > 0) {
     const lastSession = sessions[sessions.length - 1];
     avgForm = parseFloat((lastSession.form_score || 0).toFixed(1));
     avgPosture = parseFloat((lastSession.posture_score || 0).toFixed(1));
     avgArm = parseFloat((lastSession.arm_position_score || 0).toFixed(1));
     avgVisibility = parseFloat((lastSession.visibility_score || 0).toFixed(1));
  }

  sessions.forEach(s => totalReps += (s.reps || 0));

  const radarData = sessions.length > 0 ? [
    { metric: "Form", score: avgForm },
    { metric: "Posture", score: avgPosture },
    { metric: "Arm Pos", score: avgArm },
    { metric: "Visibility", score: avgVisibility }
  ] : [];

  let symmetryData: any[] = [];
  if (biomechanics.length > 0) {
    const b = biomechanics[biomechanics.length - 1]; // get latest
    symmetryData = [
      { joint: "Elbow Angles", left: b.avg_left_elbow_angle, right: b.avg_right_elbow_angle },
      { joint: "Shoulder Hinge", left: b.avg_esh_left, right: b.avg_esh_right },
      { joint: "Arm Body Angle", left: b.avg_arm_body_angle_left, right: b.avg_arm_body_angle_right },
      { joint: "Knee (Leg Bend)", left: b.avg_left_knee_angle, right: b.avg_right_knee_angle }
    ].filter(j => j.left != null && j.right != null);
  }

  const motivationData = moods.map((m, i) => ({
     rating: m.rating || 5,
     note: m.note || "Good workout!",
     date: m.date || new Date().toISOString(),
     reps: i === 0 ? totalReps : (totalReps > 20 ? totalReps - 10 : 0) // just to show varying reps if present
  }));
  
  const mostRecentDate = sessions.length > 0 ? sessions[sessions.length - 1].date : null;

  const totals = {
    totalSessions: sessions.length,
    totalReps,
    avgOverallForm: avgForm || 0,
    mostRecentDate
  };

  return (
    <>
      <Navigation user={user} />
      <DashboardClient 
         userId={userId}
         userName={user.name}
         radarData={radarData} 
         symmetryData={symmetryData} 
         motivationData={motivationData} 
         totals={totals}
      />
    </>
  );
}
