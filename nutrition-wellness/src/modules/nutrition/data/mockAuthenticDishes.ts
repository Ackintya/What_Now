import type { AuthenticBaseline } from "../types";

export const MOCK_AUTHENTIC_BASELINES: AuthenticBaseline[] = [
  {
    dish_name: "Pad Thai",
    cuisine: "Thai",
    traditional_summary:
      "A stir-fried noodle dish centered on rice noodles, tamarind-forward sauce, aromatics, and toppings like peanuts and lime.",
    core_ingredients: ["rice noodles", "tamarind", "fish sauce or soy", "garlic", "bean sprouts", "peanuts", "egg"],
    baseline_steps: [
      "Soak rice noodles and prep sauce with tamarind base.",
      "Stir-fry aromatics, add egg/protein, then noodles and sauce.",
      "Finish with bean sprouts, peanuts, and lime.",
    ],
    source_reference: "Thai cookbook baseline and regional recipe references",
  },
  {
    dish_name: "Baingan Bharta",
    cuisine: "Indian",
    traditional_summary:
      "Smoky mashed eggplant curry with onion, tomato, and warming spices, usually served with roti or rice.",
    core_ingredients: ["eggplant", "onion", "tomato", "garlic", "ginger", "green chili", "spices", "oil or ghee"],
    baseline_steps: [
      "Roast eggplant until charred and soft.",
      "Cook onion-tomato masala and fold in mashed eggplant.",
      "Simmer briefly and finish with herbs.",
    ],
    source_reference: "Regional North Indian home-style recipes",
  },
  {
    dish_name: "Rajma Chawal",
    cuisine: "Indian",
    traditional_summary:
      "Kidney bean curry simmered in tomato-onion gravy served with steamed rice.",
    core_ingredients: ["kidney beans", "onion", "tomato", "ginger garlic", "spices", "rice"],
    baseline_steps: [
      "Pressure-cook or simmer soaked kidney beans.",
      "Prepare masala base and combine with beans.",
      "Serve with steamed rice and garnish.",
    ],
    source_reference: "Punjabi household preparation patterns",
  },
  {
    dish_name: "Shakshuka",
    cuisine: "Middle Eastern",
    traditional_summary:
      "Eggs poached in a spiced tomato and pepper sauce, often served with bread.",
    core_ingredients: ["eggs", "tomatoes", "bell peppers", "onion", "garlic", "olive oil", "cumin", "paprika"],
    baseline_steps: [
      "Cook aromatics and peppers in oil.",
      "Add tomatoes and spices to make sauce.",
      "Poach eggs in sauce until set.",
    ],
    source_reference: "Levant and North African home-style references",
  },
  {
    dish_name: "Pozole Rojo",
    cuisine: "Mexican",
    traditional_summary:
      "A hominy-based soup with chile broth and pork or chicken, topped with crunchy garnishes.",
    core_ingredients: ["hominy", "chiles", "onion", "garlic", "broth", "pork or chicken"],
    baseline_steps: [
      "Prepare chile broth base.",
      "Simmer protein and hominy in broth.",
      "Serve with cabbage, radish, lime, and herbs.",
    ],
    source_reference: "Traditional Mexican holiday and family recipe sources",
  },
  {
    dish_name: "Miso Salmon Don",
    cuisine: "Japanese",
    traditional_summary:
      "A rice bowl with miso-glazed fish and simple pickled or steamed accompaniments.",
    core_ingredients: ["salmon", "miso", "rice", "soy sauce", "mirin", "ginger"],
    baseline_steps: [
      "Marinate fish in miso mixture.",
      "Bake or broil fish until cooked.",
      "Serve over rice with vegetables.",
    ],
    source_reference: "Japanese donburi-style preparation references",
  },
];
