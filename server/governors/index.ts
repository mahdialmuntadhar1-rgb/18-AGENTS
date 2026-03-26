import { RestaurantsGovernor } from "./restaurants.js";
import { QualityControlGovernor } from "./qc-manager.js";
import { BaseGovernor } from "./base-governor.js";

class GenericWorkerGovernor extends BaseGovernor {
  constructor(public agentName: string, public category: string, public governmentRate: string) {
    super();
  }

  async gather(): Promise<any[]> {
    throw new Error(`NOT_IMPLEMENTED: connector missing for ${this.agentName}/${this.category}`);
  }
}

const governors: Record<string, any> = {
  "Agent-01": new RestaurantsGovernor(),
  "QC Overseer": new QualityControlGovernor(),
};

const agentConfigs = [
  { id: "Agent-02", category: "cafes", rate: "Rate Level 1" },
  { id: "Agent-03", category: "bakeries", rate: "Rate Level 1" },
  { id: "Agent-04", category: "hotels", rate: "Rate Level 1" },
  { id: "Agent-05", category: "gyms", rate: "Rate Level 2" },
  { id: "Agent-06", category: "beauty_salons", rate: "Rate Level 2" },
  { id: "Agent-07", category: "pharmacies", rate: "Rate Level 2" },
  { id: "Agent-08", category: "supermarkets", rate: "Rate Level 2" },
  { id: "Agent-09", category: "restaurants", rate: "Rate Level 3" },
  { id: "Agent-10", category: "cafes", rate: "Rate Level 3" },
  { id: "Agent-11", category: "bakeries", rate: "Rate Level 3" },
  { id: "Agent-12", category: "hotels", rate: "Rate Level 3" },
  { id: "Agent-13", category: "gyms", rate: "Rate Level 4" },
  { id: "Agent-14", category: "beauty_salons", rate: "Rate Level 4" },
  { id: "Agent-15", category: "pharmacies", rate: "Rate Level 4" },
  { id: "Agent-16", category: "supermarkets", rate: "Rate Level 5" },
  { id: "Agent-17", category: "restaurants", rate: "Rate Level 5" },
  { id: "Agent-18", category: "cafes", rate: "Rate Level 5" },
];

agentConfigs.forEach((config) => {
  if (!governors[config.id]) {
    governors[config.id] = new GenericWorkerGovernor(config.id, config.category, config.rate);
  }
});

export async function runGovernor(agentName: string) {
  const governor = governors[agentName];
  if (!governor) {
    throw new Error(`Governor ${agentName} not found`);
  }

  await governor.run();
}

export async function runAllGovernors() {
  for (const agentName of Object.keys(governors)) {
    await runGovernor(agentName);
  }
}
