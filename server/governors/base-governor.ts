import { supabaseAdmin } from "../supabase-admin.js";

export abstract class BaseGovernor {
  protected supabase = supabaseAdmin;
  abstract category: string;
  abstract agentName: string;

  async run() {
    await this.setStatus("active");
    try {
      const businesses = await this.gather();
      const validated = await this.validate(businesses);
      const { added, updated } = await this.store(validated);
      await this.log("success", added, updated);
    } catch (err) {
      console.error(`Error in ${this.agentName}:`, err);
      await this.setStatus("error");
      await this.log("error", 0, 0);
    }
    await this.setStatus("idle");
  }

  abstract gather(): Promise<any[]>; // fetch from external source

  async validate(items: any[]) {
    return items.filter((i) => i.name && i.address);
  }

  async store(items: any[]) {
    let added = 0,
      updated = 0;
    for (const item of items) {
      const { data } = await this.supabase
        .from("businesses")
        .select("id")
        .eq("name", item.name)
        .eq("address", item.address)
        .single();
      
      if (data) {
        await this.supabase
          .from("businesses")
          .update({ ...item, last_updated: new Date() })
          .eq("id", data.id);
        updated++;
      } else {
        await this.supabase.from("businesses").insert(item);
        added++;
      }
    }
    return { added, updated };
  }

  async setStatus(status: string) {
    await this.supabase
      .from("agents")
      .update({ status, last_run: new Date() })
      .eq("agent_name", this.agentName);
  }

  async log(result: string, added: number, updated: number) {
    const { data: agent } = await this.supabase
      .from("agents")
      .select("id")
      .eq("agent_name", this.agentName)
      .single();
      
    if (agent) {
      await this.supabase.from("agent_logs").insert({
        agent_id: agent.id,
        action: "run",
        result,
        records_added: added,
        records_updated: updated,
      });
    }
  }
}
