/** Classify farmer chat questions into knowledge-gap topics */
export function extractChatTopic(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('nitrogen') || q.includes('npk') || q.includes('nutrient')) {
    return 'Fertilizer & nutrients';
  }
  if (q.includes('yellow') || q.includes('wilting') || q.includes('discolor')) {
    return 'Crop discoloration / health';
  }
  if (q.includes('maize') || q.includes('corn')) return 'Maize / corn issues';
  if (q.includes('rice')) return 'Rice cultivation';
  if (q.includes('tomato') || q.includes('blight')) return 'Tomato diseases';
  if (q.includes('cassava')) return 'Cassava diseases';
  if (q.includes('fertiliz')) return 'Fertilizer & nutrients';
  if (q.includes('pest') || q.includes('insect')) return 'Pest management';
  if (q.includes('drought') || q.includes('irrigation') || q.includes('water')) {
    return 'Water & irrigation';
  }
  if (q.includes('weather') || q.includes('rain')) return 'Weather & planting timing';
  if (q.includes('plant') || q.includes('when') || q.includes('season')) {
    return 'Planting schedules';
  }
  if (q.includes('harvest')) return 'Harvest timing';
  return 'General farming advice';
}

export function priorityFromCount(count: number): 'low' | 'medium' | 'high' {
  if (count >= 20) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}
