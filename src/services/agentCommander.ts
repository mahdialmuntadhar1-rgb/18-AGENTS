import { supabase } from '../lib/supabase';

export interface BusinessRecord {
  id?: string;
  name: { en: string; ar: string; ku: string };
  description: { en: string; ar: string; ku: string };
  category: string;
  whatsapp: string;
  latitude: number;
  longitude: number;
  governorate: string;
  confidence_score?: number;
  is_verified?: boolean;
  needs_review?: boolean;
  scraped_photo_url?: string;
  ai_processed_data?: any;
}

export class AgentCommander {
  /**
   * Triggers a regional agent to start processing.
   * In a real scenario, this would call a Supabase Edge Function.
   */
  static async triggerRegionalAgent(governorate: string) {
    console.log(`Triggering agent for ${governorate}...`);
    
    // Mocking the trigger
    const { data, error } = await supabase
      .from('agent_logs')
      .insert({
        agent_name: `${governorate.toLowerCase()}_agent`,
        details: `Agent started processing for ${governorate}`,
        action: 'info',
        governorate
      });

    if (error) throw error;
    return data;
  }

  /**
   * QC Overseer Logic: Flags records for visual review if confidence < 85%
   */
  static async runQCOverseer(recordId: string, confidenceScore: number) {
    const needsReview = confidenceScore < 0.85;
    
    const { error } = await supabase
      .from('businesses')
      .update({ 
        needs_review: needsReview,
        confidence_score: confidenceScore,
        is_verified: !needsReview
      })
      .eq('id', recordId);

    if (error) throw error;

    if (needsReview) {
      await supabase.from('agent_logs').insert({
        agent_name: 'qc_overseer',
        details: `Record ${recordId} flagged for visual review (Confidence: ${(confidenceScore * 100).toFixed(1)}%)`,
        action: 'warning'
      });
    }

    return { needsReview };
  }

  /**
   * Manual Override for Super Admins
   */
  static async manualOverride(recordId: string, updates: Partial<BusinessRecord>) {
    const { data, error } = await supabase
      .from('businesses')
      .update({
        ...updates,
        is_verified: true,
        needs_review: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select();

    if (error) throw error;
    return data;
  }
}
