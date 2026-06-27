/**
 * Crop-specific reference data for local diagnosis (used until AI API is connected).
 * Results are matched to the farmer's actual registered crops — not random.
 */
export interface CropKnowledgeEntry {
  commonDiseases: { name: string; treatment: string; confidence: number }[];
  healthyTreatment: string;
}

export const CROP_KNOWLEDGE: Record<string, CropKnowledgeEntry> = {
  Rice: {
    commonDiseases: [
      {
        name: 'Bacterial Leaf Blight',
        treatment: 'Use resistant varieties. Avoid excess nitrogen. Improve field drainage.',
        confidence: 0.79,
      },
    ],
    healthyTreatment: 'Maintain 2–5 cm flood depth. Scout for planthopper after rains.',
  },
  Tomato: {
    commonDiseases: [
      {
        name: 'Early Blight',
        treatment: 'Apply copper fungicide. Remove lower infected leaves. Improve air flow.',
        confidence: 0.87,
      },
    ],
    healthyTreatment: 'Water at base. Stake plants. Monitor for blossom end rot.',
  },
  Corn: {
    commonDiseases: [
      {
        name: 'Northern Corn Leaf Blight',
        treatment: 'Rotate crops. Use tolerant hybrids. Fungicide if severe.',
        confidence: 0.81,
      },
    ],
    healthyTreatment: 'Maintain moisture during silking. Scout for armyworm.',
  },
  Eggplant: {
    commonDiseases: [
      {
        name: 'Fruit Rot',
        treatment: 'Improve drainage. Avoid wetting fruit. Remove affected fruits.',
        confidence: 0.83,
      },
    ],
    healthyTreatment: 'Prune for airflow. Mulch to retain soil moisture.',
  },
  Cassava: {
    commonDiseases: [
      {
        name: 'Cassava Mosaic Disease',
        treatment: 'Remove infected plants. Use certified virus-free cuttings.',
        confidence: 0.76,
      },
    ],
    healthyTreatment: 'Weed regularly. Harvest at 8–12 months depending on variety.',
  },
  Onion: {
    commonDiseases: [
      {
        name: 'Purple Blotch',
        treatment: 'Avoid overhead irrigation. Apply fungicide at first signs.',
        confidence: 0.78,
      },
    ],
    healthyTreatment: 'Keep bulbs dry before storage. Rotate with non-allium crops.',
  },
  Banana: {
    commonDiseases: [
      {
        name: 'Black Sigatoka (leaf spot)',
        treatment:
          'Remove severely infected leaves. Improve airflow. Apply approved fungicide (e.g. mancozeb or propiconazole) on a 10–14 day schedule in wet season. Avoid overhead irrigation on foliage.',
        confidence: 0.82,
      },
      {
        name: 'Panama disease (Fusarium wilt)',
        treatment:
          'No cure — remove and destroy infected plants. Do not replant banana on same soil for 3+ years. Use resistant varieties if available.',
        confidence: 0.75,
      },
      {
        name: 'Banana weevil borer',
        treatment:
          'Clean up corm debris. Use pheromone traps. Apply recommended insecticide to corm at planting.',
        confidence: 0.7,
      },
    ],
    healthyTreatment: 'Mulch around plants. Fertilize regularly. Remove old leaves to reduce disease pressure.',
  },
  Mango: {
    commonDiseases: [
      {
        name: 'Anthracnose',
        treatment:
          'Prune dead wood. Apply copper fungicide at flower flush and after harvest. Remove infected fruit and leaves.',
        confidence: 0.8,
      },
      {
        name: 'Powdery mildew',
        treatment: 'Improve airflow through pruning. Apply sulfur or approved fungicide at first white coating on leaves.',
        confidence: 0.77,
      },
    ],
    healthyTreatment: 'Prune for open canopy. Monitor during flowering and fruit set.',
  },
  Mahangu: {
    commonDiseases: [
      {
        name: 'Downy mildew',
        treatment: 'Use resistant varieties. Avoid dense planting. Fungicide if severe during humid periods.',
        confidence: 0.74,
      },
      {
        name: 'Ergot',
        treatment: 'Remove infected heads before spores spread. Rotate crops. Use clean seed.',
        confidence: 0.72,
      },
    ],
    healthyTreatment: 'Plant with first rains. Weed early. Harvest when grain is hard.',
  },
  Beetroot: {
    commonDiseases: [
      {
        name: 'Cercospora leaf spot',
        treatment: 'Remove infected leaves. Rotate crops. Apply fungicide if spots spread rapidly.',
        confidence: 0.79,
      },
    ],
    healthyTreatment: 'Avoid waterlogging. Thin seedlings for airflow.',
  },
};

export const DEFAULT_CROP_KNOWLEDGE: CropKnowledgeEntry = {
  commonDiseases: [],
  healthyTreatment: 'Continue regular monitoring and record observations in your calendar.',
};
