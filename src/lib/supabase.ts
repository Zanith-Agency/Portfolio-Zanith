import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Project {
  id: string;
  slug: string;
  title: string;
  category: string;
  image_path: string;
  description: string | null;
  tools: string[] | null;
  sort_order: number;

  // Page projet — tous facultatifs : une section sans contenu n'est
  // simplement pas affichée.
  tagline: string | null; // phrase d'accroche (vitrine)
  client_sector: string | null; // secteur d'activité
  project_year: string | null; // année
  services: string[] | null; // prestations Zanith
  site_url: string | null; // lien vers le site final
  theme_bg: string | null; // couleurs du thème (#RRGGBB)
  theme_text: string | null;
  theme_accent: string | null;
  overview: string | null; // section 01
  challenge: string | null; // section 02
  process: string | null; // section 03
  development: string | null; // section 04
  outcome: string | null; // section 05
  gallery: string[] | null; // images de la section 04 (URLs)
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Erreur Supabase (getProjects):", error.message);
    return [];
  }
  return data ?? [];
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erreur Supabase (getProjectBySlug):", error.message);
    return null;
  }
  return data;
}

// Projet suivant dans l'ordre de sort_order. Après le dernier, on
// revient au premier. null s'il n'y a qu'un seul projet.
export async function getNextProject(current: Project): Promise<Project | null> {
  const projects = await getProjects();
  if (projects.length < 2) return null;

  const index = projects.findIndex((project) => project.id === current.id);
  const next = projects[(index + 1) % projects.length];
  return next && next.id !== current.id ? next : null;
}