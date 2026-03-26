import { BaseGovernor } from "./base-governor.js";

export class QualityControlGovernor extends BaseGovernor {
  category = "Quality Control";
  agentName = "QC Overseer";
  governmentRate = "Supervisory";

  async gather(): Promise<any[]> {
    await this.removeDuplicates();
    await this.flagIncompleteData();
    await this.monitorAgents();
    return [];
  }

  async removeDuplicates() {
    const { data: duplicates } = await this.supabase
      .from("businesses")
      .select("name, city, id")
      .order("name");

    if (duplicates) {
      const seen = new Set();
      for (const biz of duplicates) {
        const key = `${biz.name}-${biz.city}`.toLowerCase();
        if (seen.has(key)) {
          await this.supabase.from("businesses").delete().eq("id", biz.id);
        } else {
          seen.add(key);
        }
      }
    }
  }

  async flagIncompleteData() {
    await this.supabase
      .from("businesses")
      .update({ verification_status: "Flagged" })
      .or("phone.is.null,website.is.null");
  }

  async monitorAgents() {
    const { data: stalled } = await this.supabase
      .from("agents")
      .select("agent_name")
      .eq("status", "error");

    if (stalled && stalled.length > 0) {
      for (const agent of stalled) {
        await this.supabase
          .from("agents")
          .update({ status: "idle" })
          .eq("agent_name", agent.agent_name);
      }
    }

    const { count } = await this.supabase
      .from("agent_tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "retrying"]);

    if ((count || 0) < 10) {
      await this.generateNewTasks();
    }
  }

  async generateNewTasks() {
    const seedTasks = [
      { city: "Baghdad", category: "restaurants", government_rate: "Rate Level 1" },
      { city: "Basra", category: "cafes", government_rate: "Rate Level 1" },
      { city: "Erbil", category: "hotels", government_rate: "Rate Level 2" },
      { city: "Najaf", category: "pharmacies", government_rate: "Rate Level 3" },
    ];

    const now = new Date().toISOString();
    await this.supabase.from("agent_tasks").insert(
      seedTasks.map((task) => ({
        ...task,
        task_type: "scrape",
        status: "pending",
        description: `Collect ${task.category} in ${task.city}`,
        created_at: now,
      }))
    );
  }
}
