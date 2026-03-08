import type { PantryMealDraft } from "../types";

export interface PantryTemplate {
  id: string;
  required_any: string[];
  friendly_name: string;
  meal: PantryMealDraft;
}

export const MOCK_PANTRY_TEMPLATES: PantryTemplate[] = [
  {
    id: "egg-veggie-scramble-bowl",
    required_any: ["egg", "eggs", "spinach", "bell pepper", "onion"],
    friendly_name: "Egg and veggie scramble bowl",
    meal: {
      title: "Protein-Forward Egg Veggie Scramble Bowl",
      description: "Quick skillet bowl with eggs, sauteed vegetables, and optional Greek yogurt sauce.",
      cuisine: "Global",
      goal_context: "Quick high-protein meal",
      ingredients: [
        "3 eggs",
        "1 cup chopped mixed vegetables",
        "1 tsp olive oil",
        "Salt, pepper, chili flakes",
        "2 tbsp Greek yogurt (optional)",
      ],
      instructions: [
        "Heat oil, saute chopped vegetables for 3-4 minutes.",
        "Whisk eggs with seasoning and pour into skillet.",
        "Cook until softly set and serve warm with yogurt.",
      ],
      tags: ["high-protein", "quick", "pantry"],
      protein_focus_level: "medium-high",
      generated_with_gemini: false,
      result: "A high-protein option that can be cooked in under 15 minutes with common fridge ingredients.",
      why_it_fits: "Eggs provide concentrated protein while vegetables add volume, making it filling without being heavy.",
      confidence: "high",
      also_check: "Also check: the official nutrition label for exact protein and calorie details.",
    },
  },
  {
    id: "lentil-chickpea-power-bowl",
    required_any: ["lentil", "lentils", "chickpea", "chickpeas", "beans"],
    friendly_name: "Lentil and chickpea power bowl",
    meal: {
      title: "Lentil-Chickpea Recovery Bowl",
      description: "Pantry-friendly bowl with legumes, herbs, and lemon-yogurt dressing.",
      cuisine: "Mediterranean-inspired",
      goal_context: "Lighter recovery meal",
      ingredients: [
        "1 cup cooked lentils",
        "1 cup cooked chickpeas",
        "1 tsp olive oil",
        "1 tsp cumin",
        "Lemon juice and fresh herbs",
      ],
      instructions: [
        "Warm lentils and chickpeas with cumin in a skillet.",
        "Season with salt, lemon, and herbs.",
        "Serve as a bowl with optional yogurt topping.",
      ],
      tags: ["high-protein", "vegetarian", "fiber-rich"],
      protein_focus_level: "high",
      generated_with_gemini: false,
      result: "A protein-forward and fiber-rich option suitable for recovery and satiety.",
      why_it_fits: "Legumes deliver plant protein and help keep meals filling while staying budget- and pantry-friendly.",
      confidence: "high",
      also_check: "Also check: the recipe ingredient list and serving sizes before cooking.",
    },
  },
  {
    id: "chicken-rice-skillet",
    required_any: ["chicken", "rice", "yogurt", "garlic"],
    friendly_name: "Chicken rice skillet",
    meal: {
      title: "Post-Workout Chicken Rice Skillet",
      description: "Lean chicken and rice skillet with garlic, herbs, and optional yogurt sauce.",
      cuisine: "Home-style",
      goal_context: "Post-workout high-protein meal",
      ingredients: [
        "200g diced chicken breast",
        "1 cup cooked rice",
        "1 tsp oil",
        "Garlic, paprika, black pepper",
        "2 tbsp Greek yogurt (optional)",
      ],
      instructions: [
        "Season chicken and sear in skillet until cooked.",
        "Add rice, garlic, and seasonings; toss for 2 minutes.",
        "Serve with yogurt and herbs.",
      ],
      tags: ["high-protein", "post-workout", "quick"],
      protein_focus_level: "high",
      generated_with_gemini: false,
      result: "A practical high-protein post-workout meal using staple ingredients.",
      why_it_fits: "Lean protein plus carbs can support recovery while still keeping preparation simple.",
      confidence: "high",
      also_check: "Also check: the official nutrition label for exact protein and calorie details.",
    },
  },
  {
    id: "tofu-stir-fry-noodle",
    required_any: ["tofu", "soy sauce", "noodles", "broccoli"],
    friendly_name: "Tofu stir-fry noodles",
    meal: {
      title: "Protein-Forward Tofu Stir-Fry Noodles",
      description: "Pan-seared tofu noodles with vegetables and a balanced soy-ginger sauce.",
      cuisine: "Asian-inspired",
      goal_context: "High-protein vegetarian meal",
      ingredients: [
        "200g firm tofu",
        "2 cups vegetables",
        "1 serving noodles",
        "1 tbsp soy sauce",
        "1 tsp sesame or neutral oil",
      ],
      instructions: [
        "Sear tofu cubes until golden.",
        "Stir-fry vegetables and add noodles.",
        "Combine tofu and sauce, toss and serve.",
      ],
      tags: ["vegetarian", "high-protein", "weeknight"],
      protein_focus_level: "medium-high",
      generated_with_gemini: false,
      result: "A protein-forward vegetarian meal that keeps prep time manageable.",
      why_it_fits: "Tofu adds quality protein while vegetables and noodles keep the dish balanced and practical.",
      confidence: "medium",
      also_check: "Also check: the recipe ingredient list and serving sizes before cooking.",
    },
  },
];
