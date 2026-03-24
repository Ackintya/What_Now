// Cross-Correlation Engine - Connecting Health Data Points
import { GoogleGenerativeAI } from '@google/generative-ai';

class CrossCorrelationEngine {
  constructor(apiKey, dbConnection) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.db = dbConnection;
    this.nutritionalCorrelator = new NutritionalCorrelator(this.model);
    this.workoutStressAnalyzer = new WorkoutStressCorrelator();
    this.sleepRecoveryAnalyzer = new SleepRecoveryCorrelator();
    this.patternDetector = new PatternDetector();
    this.insightGenerator = new InsightGenerator(this.model);
  }

  /**
   * Main analysis method - performs comprehensive health correlation
   * @param {string} userId - User ID
   * @param {number} timeWindowDays - Days to analyze (default 30)
   * @returns {Promise<Object>} Complete correlation analysis
   */
  async analyzeUserHealth(userId, timeWindowDays = 30) {
    try {
      console.log(`Starting health correlation analysis for user ${userId}`);

      // Step 1: Gather all health data
      const healthData = await this.gatherHealthData(userId, timeWindowDays);

      // Step 2: Analyze individual correlations
      const correlations = await this.analyzeCorrelations(healthData);

      // Step 3: Detect patterns and feedback loops
      const patterns = this.patternDetector.detectPatterns(correlations, healthData);

      // Step 4: Generate insights
      const insights = await this.insightGenerator.generateInsights(
        patterns,
        correlations,
        healthData
      );

      // Step 5: Create recommendations
      const recommendations = await this.createRecommendations(
        insights,
        healthData
      );

      return {
        summary: this.generateSummary(correlations, patterns),
        correlations,
        patterns,
        insights,
        recommendations,
        dataQuality: this.assessDataQuality(healthData),
        analysisDate: new Date().toISOString(),
        timeWindow: timeWindowDays
      };
    } catch (error) {
      console.error('Health correlation analysis failed:', error);
      throw error;
    }
  }

  /**
   * Gather all health data for analysis
   */
  async gatherHealthData(userId, timeWindowDays) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindowDays);

    const [
      workoutData,
      nutritionLogs,
      skinLogs,
      hairLogs,
      sleepLogs,
      supplementLogs,
      userProfile
    ] = await Promise.all([
      this.db.collection('workout_sessions').find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray(),

      this.db.collection('nutrition_logs').find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray(),

      this.db.collection('skin_analyses').find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray(),

      this.db.collection('hair_analyses').find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray(),

      this.db.collection('sleep_logs').find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray(),

      this.db.collection('supplement_logs').find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray(),

      this.db.collection('user_profiles').findOne({ user_id: userId })
    ]);

    return {
      workoutData,
      nutritionLogs,
      skinLogs,
      hairLogs,
      sleepLogs,
      supplementLogs,
      userProfile,
      timeWindow: { startDate, endDate }
    };
  }

  /**
   * Analyze correlations between different health aspects
   */
  async analyzeCorrelations(healthData) {
    const correlations = {};

    // Nutrition → Skin/Hair correlation
    correlations.nutritionToSkin = await this.nutritionalCorrelator.correlateWithSkin(
      healthData.nutritionLogs,
      healthData.skinLogs
    );

    correlations.nutritionToHair = await this.nutritionalCorrelator.correlateWithHair(
      healthData.nutritionLogs,
      healthData.hairLogs
    );

    // Workout → Stress → Skin correlation
    correlations.workoutToSkin = await this.workoutStressAnalyzer.analyzeWorkoutSkinConnection(
      healthData.workoutData,
      healthData.skinLogs
    );

    // Sleep → Recovery → Skin correlation
    correlations.sleepToSkin = await this.sleepRecoveryAnalyzer.analyzeSleepSkinConnection(
      healthData.sleepLogs,
      healthData.skinLogs
    );

    // Sleep → Workout performance correlation
    correlations.sleepToWorkout = await this.sleepRecoveryAnalyzer.analyzeSleepWorkoutConnection(
      healthData.sleepLogs,
      healthData.workoutData
    );

    // Supplement effectiveness correlation
    if (healthData.supplementLogs.length > 0) {
      correlations.supplementEffects = await this.analyzeSupplementEffects(
        healthData.supplementLogs,
        healthData
      );
    }

    return correlations;
  }

  /**
   * Analyze supplement effects on various health metrics
   */
  async analyzeSupplementEffects(supplementLogs, healthData) {
    const effects = {
      skinImprovements: [],
      hairImprovements: [],
      workoutImprovements: [],
      sleepImprovements: []
    };

    // Group supplements by type
    const supplementGroups = this.groupSupplementsByType(supplementLogs);

    for (const [supplementType, logs] of Object.entries(supplementGroups)) {
      // Find periods when supplement was taken consistently
      const consistentPeriods = this.findConsistentSupplementPeriods(logs);

      for (const period of consistentPeriods) {
        // Analyze changes in metrics during this period
        const changes = await this.analyzeMetricChanges(
          period,
          healthData,
          supplementType
        );

        if (changes.skinImprovement > 0.2) {
          effects.skinImprovements.push({
            supplement: supplementType,
            improvement: changes.skinImprovement,
            period: period,
            confidence: changes.confidence
          });
        }

        if (changes.hairImprovement > 0.2) {
          effects.hairImprovements.push({
            supplement: supplementType,
            improvement: changes.hairImprovement,
            period: period,
            confidence: changes.confidence
          });
        }
      }
    }

    return effects;
  }

  /**
   * Create actionable recommendations based on insights
   */
  async createRecommendations(insights, healthData) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    // Process each insight to generate recommendations
    for (const insight of insights) {
      if (insight.type === 'nutritional_deficiency') {
        recommendations.immediate.push({
          category: 'nutrition',
          action: `Increase intake of ${insight.nutrient}`,
          reasoning: insight.explanation,
          expectedBenefit: insight.expectedImprovement,
          foods: await this.getFoodSources(insight.nutrient),
          priority: 'high'
        });
      }

      if (insight.type === 'workout_stress') {
        recommendations.shortTerm.push({
          category: 'exercise',
          action: 'Add recovery days between high-intensity workouts',
          reasoning: insight.explanation,
          expectedBenefit: 'Reduced cortisol and improved skin quality',
          implementation: this.getRecoveryProtocol(healthData.workoutData),
          priority: 'medium'
        });
      }

      if (insight.type === 'sleep_quality') {
        recommendations.immediate.push({
          category: 'sleep',
          action: insight.recommendation,
          reasoning: insight.explanation,
          expectedBenefit: 'Improved skin recovery and workout performance',
          tips: this.getSleepTips(healthData.sleepLogs),
          priority: 'high'
        });
      }
    }

    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Generate summary of correlation analysis
   */
  generateSummary(correlations, patterns) {
    const summary = {
      strongestCorrelations: [],
      keyFindings: [],
      overallHealthScore: 0,
      areasOfConcern: [],
      areasOfSuccess: []
    };

    // Find strongest correlations
    for (const [key, correlation] of Object.entries(correlations)) {
      if (correlation.strength > 0.7) {
        summary.strongestCorrelations.push({
          type: key,
          strength: correlation.strength,
          impact: correlation.impact
        });
      }
    }

    // Extract key findings from patterns
    summary.keyFindings = patterns
      .filter(p => p.confidence > 0.6)
      .map(p => p.finding)
      .slice(0, 5);

    // Calculate overall health score
    summary.overallHealthScore = this.calculateHealthScore(correlations, patterns);

    return summary;
  }

  /**
   * Assess data quality for analysis reliability
   */
  assessDataQuality(healthData) {
    const quality = {
      completeness: 0,
      consistency: 0,
      recency: 0,
      overall: 0
    };

    // Check completeness
    const totalDays = Math.ceil(
      (healthData.timeWindow.endDate - healthData.timeWindow.startDate) / (1000 * 60 * 60 * 24)
    );

    quality.completeness = {
      workout: (healthData.workoutData.length / totalDays) * 100,
      nutrition: (healthData.nutritionLogs.length / totalDays) * 100,
      skin: (healthData.skinLogs.length / (totalDays / 7)) * 100, // Weekly expected
      hair: (healthData.hairLogs.length / (totalDays / 14)) * 100, // Bi-weekly expected
      sleep: (healthData.sleepLogs.length / totalDays) * 100
    };

    // Check consistency
    quality.consistency = this.assessDataConsistency(healthData);

    // Check recency
    const daysSinceLastEntry = {
      workout: this.daysSince(healthData.workoutData[healthData.workoutData.length - 1]?.date),
      skin: this.daysSince(healthData.skinLogs[healthData.skinLogs.length - 1]?.date)
    };

    quality.recency = daysSinceLastEntry.workout < 3 && daysSinceLastEntry.skin < 7 ? 100 : 50;

    // Calculate overall quality
    quality.overall = (
      quality.completeness.workout * 0.2 +
      quality.completeness.nutrition * 0.2 +
      quality.completeness.skin * 0.2 +
      quality.completeness.sleep * 0.2 +
      quality.consistency * 0.1 +
      quality.recency * 0.1
    );

    return quality;
  }

  /**
   * Helper methods
   */
  daysSince(date) {
    if (!date) return Infinity;
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  }

  calculateHealthScore(correlations, patterns) {
    // Complex scoring based on multiple factors
    let score = 50; // Base score

    // Positive correlations increase score
    if (correlations.sleepToSkin?.strength > 0.5 && correlations.sleepToSkin?.impact > 0) {
      score += 10;
    }

    // Negative patterns decrease score
    const negativePatterns = patterns.filter(p => p.impact === 'negative');
    score -= negativePatterns.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  groupSupplementsByType(supplementLogs) {
    const groups = {};
    for (const log of supplementLogs) {
      if (!groups[log.supplementName]) {
        groups[log.supplementName] = [];
      }
      groups[log.supplementName].push(log);
    }
    return groups;
  }

  findConsistentSupplementPeriods(logs, minDays = 14) {
    const periods = [];
    let currentPeriod = null;

    logs.sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const log of logs) {
      if (!currentPeriod) {
        currentPeriod = { start: log.date, end: log.date, logs: [log] };
      } else {
        const daysSinceLastLog = this.daysBetween(currentPeriod.end, log.date);
        if (daysSinceLastLog <= 2) {
          currentPeriod.end = log.date;
          currentPeriod.logs.push(log);
        } else {
          if (this.daysBetween(currentPeriod.start, currentPeriod.end) >= minDays) {
            periods.push(currentPeriod);
          }
          currentPeriod = { start: log.date, end: log.date, logs: [log] };
        }
      }
    }

    if (currentPeriod && this.daysBetween(currentPeriod.start, currentPeriod.end) >= minDays) {
      periods.push(currentPeriod);
    }

    return periods;
  }

  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  async analyzeMetricChanges(period, healthData, supplementType) {
    // Find relevant metrics before and after supplement period
    const beforeMetrics = this.getMetricsBefore(period.start, healthData, 14);
    const duringMetrics = this.getMetricsDuring(period, healthData);

    const changes = {
      skinImprovement: 0,
      hairImprovement: 0,
      workoutImprovement: 0,
      confidence: 0
    };

    if (beforeMetrics.skin.length > 0 && duringMetrics.skin.length > 0) {
      const beforeAvg = this.averageSkinScore(beforeMetrics.skin);
      const duringAvg = this.averageSkinScore(duringMetrics.skin);
      changes.skinImprovement = (duringAvg - beforeAvg) / beforeAvg;
    }

    // Calculate confidence based on data availability
    changes.confidence = Math.min(
      beforeMetrics.skin.length / 2,
      duringMetrics.skin.length / 2,
      1
    ) * 100;

    return changes;
  }

  getMetricsBefore(date, healthData, daysBefore) {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - daysBefore);

    return {
      skin: healthData.skinLogs.filter(log =>
        new Date(log.date) >= startDate && new Date(log.date) < new Date(date)
      ),
      hair: healthData.hairLogs.filter(log =>
        new Date(log.date) >= startDate && new Date(log.date) < new Date(date)
      )
    };
  }

  getMetricsDuring(period, healthData) {
    return {
      skin: healthData.skinLogs.filter(log =>
        new Date(log.date) >= new Date(period.start) &&
        new Date(log.date) <= new Date(period.end)
      ),
      hair: healthData.hairLogs.filter(log =>
        new Date(log.date) >= new Date(period.start) &&
        new Date(log.date) <= new Date(period.end)
      )
    };
  }

  averageSkinScore(skinLogs) {
    if (skinLogs.length === 0) return 0;

    const totalScore = skinLogs.reduce((sum, log) => {
      // Calculate inverse score (lower is better for issues)
      const issueScore = (
        (log.acne?.score || 0) +
        (log.darkCircles?.score || 0) +
        (log.texture?.oiliness || 0) +
        (log.texture?.dryness || 0)
      ) / 4;

      return sum + (10 - issueScore); // Convert to positive score
    }, 0);

    return totalScore / skinLogs.length;
  }

  async getFoodSources(nutrient) {
    const foodSources = {
      iron: ['Spinach', 'Red meat', 'Lentils', 'Quinoa', 'Dark chocolate'],
      zinc: ['Oysters', 'Beef', 'Pumpkin seeds', 'Chickpeas', 'Cashews'],
      omega3: ['Salmon', 'Walnuts', 'Chia seeds', 'Flaxseeds', 'Sardines'],
      biotin: ['Eggs', 'Almonds', 'Sweet potato', 'Mushrooms', 'Avocado'],
      vitaminC: ['Oranges', 'Strawberries', 'Bell peppers', 'Broccoli', 'Kiwi'],
      protein: ['Chicken', 'Greek yogurt', 'Eggs', 'Tofu', 'Beans']
    };

    return foodSources[nutrient.toLowerCase().replace(/[- _]/g, '')] || [];
  }

  getRecoveryProtocol(workoutData) {
    return {
      restDays: 'Add 1-2 full rest days per week',
      activeRecovery: 'Light yoga or walking on rest days',
      hydration: 'Increase water intake to 3L on workout days',
      stretching: 'Add 10-minute stretching after workouts'
    };
  }

  getSleepTips(sleepLogs) {
    const avgSleepHours = sleepLogs.reduce((sum, log) =>
      sum + (log.duration || 0), 0) / sleepLogs.length;

    const tips = [];

    if (avgSleepHours < 7) {
      tips.push('Aim for 7-9 hours of sleep per night');
      tips.push('Set a consistent bedtime 30 minutes earlier');
    }

    tips.push('Avoid screens 1 hour before bed');
    tips.push('Keep bedroom temperature at 65-68°F');
    tips.push('Use blackout curtains or eye mask');

    return tips;
  }

  prioritizeRecommendations(recommendations) {
    // Sort each category by priority
    const priorityScore = { high: 3, medium: 2, low: 1 };

    recommendations.immediate.sort((a, b) =>
      (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
    );

    recommendations.shortTerm.sort((a, b) =>
      (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
    );

    return recommendations;
  }

  assessDataConsistency(healthData) {
    // Check for consistent data entry patterns
    let consistencyScore = 100;

    // Check for gaps in data
    const workoutGaps = this.findDataGaps(healthData.workoutData);
    const nutritionGaps = this.findDataGaps(healthData.nutritionLogs);

    consistencyScore -= workoutGaps.length * 5;
    consistencyScore -= nutritionGaps.length * 3;

    return Math.max(0, consistencyScore);
  }

  findDataGaps(dataArray, expectedFrequencyDays = 1) {
    const gaps = [];
    const sorted = dataArray.sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = this.daysBetween(sorted[i-1].date, sorted[i].date);
      if (daysBetween > expectedFrequencyDays * 2) {
        gaps.push({
          start: sorted[i-1].date,
          end: sorted[i].date,
          days: daysBetween
        });
      }
    }

    return gaps;
  }
}

/**
 * Nutritional Correlator
 */
class NutritionalCorrelator {
  constructor(model) {
    this.model = model;
    this.nutrientDeficiencyMap = {
      hair_thinning: {
        nutrients: ['iron', 'protein', 'biotin', 'zinc', 'vitamin_d'],
        confidence: 0.8
      },
      dry_scalp: {
        nutrients: ['omega_3', 'vitamin_a', 'zinc'],
        confidence: 0.7
      },
      acne: {
        nutrients: ['zinc', 'omega_3', 'vitamin_a'],
        confidence: 0.75
      },
      dark_circles: {
        nutrients: ['iron', 'vitamin_k', 'vitamin_c'],
        confidence: 0.6
      },
      dry_skin: {
        nutrients: ['omega_3', 'vitamin_e', 'vitamin_c'],
        confidence: 0.7
      }
    };

    // RDA values in mg/g per day
    this.RDA = {
      iron: 18,
      zinc: 11,
      omega_3: 1.6,
      protein: 50,
      biotin: 0.03,
      vitamin_c: 90,
      vitamin_d: 0.015,
      vitamin_e: 15,
      vitamin_a: 0.9,
      vitamin_k: 0.12
    };
  }

  async correlateWithSkin(nutritionLogs, skinLogs) {
    const correlations = {
      deficiencies: [],
      improvements: [],
      strength: 0,
      impact: 0
    };

    // Calculate average nutrient intake
    const avgNutrients = await this.calculateAverageNutrients(nutritionLogs);

    // Identify deficiencies
    for (const [nutrient, intake] of Object.entries(avgNutrients)) {
      if (this.RDA[nutrient] && intake < this.RDA[nutrient] * 0.8) {
        correlations.deficiencies.push({
          nutrient,
          currentIntake: intake,
          recommended: this.RDA[nutrient],
          deficit: this.RDA[nutrient] - intake,
          percentageOfRDA: (intake / this.RDA[nutrient]) * 100
        });
      }
    }

    // Analyze skin issues and map to deficiencies
    const recentSkinIssues = this.identifySkinIssues(skinLogs);

    for (const issue of recentSkinIssues) {
      const mapping = this.nutrientDeficiencyMap[issue.type];
      if (mapping) {
        for (const nutrient of mapping.nutrients) {
          const deficiency = correlations.deficiencies.find(d => d.nutrient === nutrient);
          if (deficiency) {
            deficiency.likelyImpact = issue.type;
            deficiency.confidence = mapping.confidence;
          }
        }
      }
    }

    // Calculate correlation strength
    if (correlations.deficiencies.length > 0 && recentSkinIssues.length > 0) {
      correlations.strength = Math.min(
        correlations.deficiencies.length / 3,
        1
      ) * 0.8;
      correlations.impact = -1; // Negative impact on skin
    }

    return correlations;
  }

  async correlateWithHair(nutritionLogs, hairLogs) {
    const correlations = {
      deficiencies: [],
      improvements: [],
      strength: 0,
      impact: 0
    };

    const avgNutrients = await this.calculateAverageNutrients(nutritionLogs);

    // Check for hair-specific nutrient deficiencies
    const hairNutrients = ['protein', 'iron', 'biotin', 'zinc', 'omega_3'];

    for (const nutrient of hairNutrients) {
      const intake = avgNutrients[nutrient] || 0;
      if (this.RDA[nutrient] && intake < this.RDA[nutrient] * 0.8) {
        correlations.deficiencies.push({
          nutrient,
          currentIntake: intake,
          recommended: this.RDA[nutrient],
          impact: 'hair_health',
          severity: (this.RDA[nutrient] - intake) / this.RDA[nutrient]
        });
      }
    }

    // Analyze hair issues
    const recentHairIssues = this.identifyHairIssues(hairLogs);

    if (recentHairIssues.length > 0 && correlations.deficiencies.length > 0) {
      correlations.strength = 0.7;
      correlations.impact = -1;
    }

    return correlations;
  }

  async calculateAverageNutrients(nutritionLogs) {
    if (nutritionLogs.length === 0) return {};

    const totals = {};
    const counts = {};

    for (const log of nutritionLogs) {
      for (const [nutrient, amount] of Object.entries(log.nutrients || {})) {
        totals[nutrient] = (totals[nutrient] || 0) + amount;
        counts[nutrient] = (counts[nutrient] || 0) + 1;
      }
    }

    const averages = {};
    for (const nutrient of Object.keys(totals)) {
      averages[nutrient] = totals[nutrient] / counts[nutrient];
    }

    return averages;
  }

  identifySkinIssues(skinLogs) {
    const issues = [];
    const recentLogs = skinLogs.slice(-3); // Last 3 logs

    for (const log of recentLogs) {
      if (log.acne?.score > 5) {
        issues.push({ type: 'acne', severity: log.acne.score });
      }
      if (log.darkCircles?.score > 5) {
        issues.push({ type: 'dark_circles', severity: log.darkCircles.score });
      }
      if (log.texture?.dryness > 6) {
        issues.push({ type: 'dry_skin', severity: log.texture.dryness });
      }
    }

    return issues;
  }

  identifyHairIssues(hairLogs) {
    const issues = [];
    const recentLogs = hairLogs.slice(-2); // Last 2 logs

    for (const log of recentLogs) {
      if (log.density?.overallScore < 5) {
        issues.push({ type: 'hair_thinning', severity: 10 - log.density.overallScore });
      }
      if (log.scalpHealth?.dryness > 6) {
        issues.push({ type: 'dry_scalp', severity: log.scalpHealth.dryness });
      }
    }

    return issues;
  }
}

/**
 * Workout Stress Correlator
 */
class WorkoutStressCorrelator {
  async analyzeWorkoutSkinConnection(workoutData, skinLogs) {
    const correlation = {
      patterns: [],
      strength: 0,
      impact: 0,
      findings: []
    };

    // Calculate workout intensity over time
    const workoutIntensity = this.calculateWorkoutIntensity(workoutData);

    // Map to skin quality changes
    for (const skinLog of skinLogs) {
      const priorWorkouts = this.getWorkoutsBefore(workoutData, skinLog.date, 7);
      const intensity = this.calculateAverageIntensity(priorWorkouts);

      if (intensity > 7) {
        const skinQuality = this.calculateSkinQuality(skinLog);
        correlation.patterns.push({
          date: skinLog.date,
          workoutIntensity: intensity,
          skinQuality: skinQuality,
          correlation: intensity > 7 && skinQuality < 5 ? 'negative' : 'neutral'
        });
      }
    }

    // Analyze patterns
    const negativePatterns = correlation.patterns.filter(p => p.correlation === 'negative');
    if (negativePatterns.length > correlation.patterns.length * 0.5) {
      correlation.strength = 0.7;
      correlation.impact = -1;
      correlation.findings.push('High workout intensity correlates with decreased skin quality');
    }

    return correlation;
  }

  calculateWorkoutIntensity(workoutData) {
    return workoutData.map(workout => ({
      date: workout.date,
      intensity: this.calculateIntensityScore(workout),
      volume: workout.sets * workout.reps * workout.weight,
      duration: workout.duration
    }));
  }

  calculateIntensityScore(workout) {
    // Simple intensity calculation
    const rpe = workout.rpe || 5;
    const volumeScore = Math.min((workout.sets * workout.reps) / 50, 1) * 10;
    return (rpe + volumeScore) / 2;
  }

  getWorkoutsBefore(workoutData, date, daysBefore) {
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - daysBefore);

    return workoutData.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= startDate && workoutDate < targetDate;
    });
  }

  calculateAverageIntensity(workouts) {
    if (workouts.length === 0) return 0;
    const total = workouts.reduce((sum, w) => sum + this.calculateIntensityScore(w), 0);
    return total / workouts.length;
  }

  calculateSkinQuality(skinLog) {
    // Higher score = better skin
    const issues = (
      (skinLog.acne?.score || 0) +
      (skinLog.darkCircles?.score || 0) +
      (skinLog.texture?.oiliness || 0) +
      (skinLog.texture?.dryness || 0)
    ) / 4;

    return 10 - issues;
  }
}

/**
 * Sleep Recovery Correlator
 */
class SleepRecoveryCorrelator {
  async analyzeSleepSkinConnection(sleepLogs, skinLogs) {
    const correlation = {
      patterns: [],
      strength: 0,
      impact: 0,
      findings: []
    };

    for (const skinLog of skinLogs) {
      const priorSleep = this.getSleepBefore(sleepLogs, skinLog.date, 3);
      const avgSleep = this.calculateAverageSleep(priorSleep);

      const skinQuality = this.calculateSkinQuality(skinLog);

      correlation.patterns.push({
        date: skinLog.date,
        avgSleepHours: avgSleep.duration,
        sleepQuality: avgSleep.quality,
        skinQuality: skinQuality,
        correlation: this.calculateCorrelationStrength(avgSleep, skinQuality)
      });
    }

    // Analyze patterns
    const positiveCorrelations = correlation.patterns.filter(p => p.correlation > 0.5);
    if (positiveCorrelations.length > correlation.patterns.length * 0.6) {
      correlation.strength = 0.8;
      correlation.impact = 1;
      correlation.findings.push('Better sleep quality strongly correlates with improved skin');
    }

    // Check for minimum sleep threshold
    const lowSleepPatterns = correlation.patterns.filter(p => p.avgSleepHours < 6);
    if (lowSleepPatterns.length > 0) {
      const avgSkinQuality = lowSleepPatterns.reduce((sum, p) => sum + p.skinQuality, 0) / lowSleepPatterns.length;
      if (avgSkinQuality < 5) {
        correlation.findings.push('Less than 6 hours of sleep correlates with poor skin quality');
      }
    }

    return correlation;
  }

  async analyzeSleepWorkoutConnection(sleepLogs, workoutData) {
    const correlation = {
      patterns: [],
      strength: 0,
      impact: 0,
      findings: []
    };

    for (const workout of workoutData) {
      const priorSleep = this.getSleepBefore(sleepLogs, workout.date, 1);
      if (priorSleep.length > 0) {
        const sleepQuality = priorSleep[0].quality || priorSleep[0].duration / 9 * 10;
        const workoutPerformance = this.calculateWorkoutPerformance(workout);

        correlation.patterns.push({
          date: workout.date,
          sleepQuality: sleepQuality,
          sleepDuration: priorSleep[0].duration,
          workoutPerformance: workoutPerformance
        });
      }
    }

    // Analyze correlation
    if (correlation.patterns.length > 5) {
      const correlationCoefficient = this.calculatePearsonCorrelation(
        correlation.patterns.map(p => p.sleepQuality),
        correlation.patterns.map(p => p.workoutPerformance)
      );

      correlation.strength = Math.abs(correlationCoefficient);
      correlation.impact = correlationCoefficient > 0 ? 1 : -1;

      if (correlationCoefficient > 0.5) {
        correlation.findings.push('Better sleep quality correlates with improved workout performance');
      }
    }

    return correlation;
  }

  getSleepBefore(sleepLogs, date, daysBefore) {
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - daysBefore);

    return sleepLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate < targetDate;
    });
  }

  calculateAverageSleep(sleepLogs) {
    if (sleepLogs.length === 0) return { duration: 0, quality: 0 };

    const totalDuration = sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalQuality = sleepLogs.reduce((sum, log) => sum + (log.quality || 5), 0);

    return {
      duration: totalDuration / sleepLogs.length,
      quality: totalQuality / sleepLogs.length
    };
  }

  calculateSkinQuality(skinLog) {
    const issues = (
      (skinLog.acne?.score || 0) +
      (skinLog.darkCircles?.score || 0) +
      (skinLog.texture?.oiliness || 0) +
      (skinLog.texture?.dryness || 0)
    ) / 4;

    return 10 - issues;
  }

  calculateWorkoutPerformance(workout) {
    // Simple performance metric
    const formScore = workout.formScore || 5;
    const fatigueScore = 10 - (workout.fatigueScore || 5);
    const asymmetryScore = 10 - (workout.asymmetryScore || 5);

    return (formScore + fatigueScore + asymmetryScore) / 3;
  }

  calculateCorrelationStrength(sleep, skinQuality) {
    // Simple correlation calculation
    const sleepScore = (sleep.duration / 9) * 0.5 + (sleep.quality / 10) * 0.5;
    const correlation = (sleepScore * skinQuality) / 10;
    return Math.min(correlation, 1);
  }

  calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

/**
 * Pattern Detector
 */
class PatternDetector {
  detectPatterns(correlations, healthData) {
    const patterns = [];

    // Pattern 1: Workout-Stress-Skin Loop
    if (correlations.workoutToSkin?.strength > 0.6) {
      patterns.push({
        type: 'workout_stress_loop',
        finding: 'High-intensity workouts are affecting skin quality through stress response',
        confidence: correlations.workoutToSkin.strength,
        impact: 'negative',
        intervention: 'Balance workout intensity with recovery protocols'
      });
    }

    // Pattern 2: Sleep-Recovery-Performance Loop
    if (correlations.sleepToSkin?.strength > 0.7 && correlations.sleepToWorkout?.strength > 0.6) {
      patterns.push({
        type: 'sleep_recovery_loop',
        finding: 'Sleep quality affects both skin health and workout performance',
        confidence: (correlations.sleepToSkin.strength + correlations.sleepToWorkout.strength) / 2,
        impact: 'bidirectional',
        intervention: 'Prioritize consistent sleep schedule'
      });
    }

    // Pattern 3: Nutritional Deficiency Pattern
    if (correlations.nutritionToSkin?.deficiencies?.length > 2) {
      patterns.push({
        type: 'nutritional_deficiency_pattern',
        finding: `Multiple nutritional deficiencies detected affecting skin health`,
        confidence: 0.8,
        impact: 'negative',
        intervention: 'Adjust diet to address specific deficiencies'
      });
    }

    return patterns;
  }
}

/**
 * Insight Generator
 */
class InsightGenerator {
  constructor(model) {
    this.model = model;
  }

  async generateInsights(patterns, correlations, healthData) {
    const insights = [];

    for (const pattern of patterns) {
      const insight = await this.generatePatternInsight(pattern, healthData);
      if (insight) {
        insights.push(insight);
      }
    }

    // Add correlation-based insights
    for (const [key, correlation] of Object.entries(correlations)) {
      if (correlation.strength > 0.6) {
        const insight = await this.generateCorrelationInsight(key, correlation, healthData);
        if (insight) {
          insights.push(insight);
        }
      }
    }

    return this.prioritizeInsights(insights);
  }

  async generatePatternInsight(pattern, healthData) {
    const prompt = `
      Analyze this health pattern and provide an actionable insight:

      Pattern Type: ${pattern.type}
      Finding: ${pattern.finding}
      Confidence: ${pattern.confidence}
      Impact: ${pattern.impact}

      Generate a brief, actionable insight (2-3 sentences) that explains:
      1. What this pattern means for the user's health
      2. The specific action they should take

      Format as JSON:
      {
        "type": "pattern_type",
        "explanation": "clear explanation",
        "recommendation": "specific action",
        "expectedImprovement": "expected outcome"
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to generate insight:', error);
    }

    // Fallback insight
    return {
      type: pattern.type,
      explanation: pattern.finding,
      recommendation: pattern.intervention,
      expectedImprovement: 'Improved health metrics'
    };
  }

  async generateCorrelationInsight(correlationType, correlation, healthData) {
    if (correlation.deficiencies && correlation.deficiencies.length > 0) {
      const topDeficiency = correlation.deficiencies[0];
      return {
        type: 'nutritional_deficiency',
        nutrient: topDeficiency.nutrient,
        explanation: `Your ${topDeficiency.nutrient} intake is at ${topDeficiency.percentageOfRDA}% of recommended levels`,
        recommendation: `Increase ${topDeficiency.nutrient}-rich foods in your diet`,
        expectedImprovement: `Improved ${topDeficiency.likelyImpact || 'health metrics'}`
      };
    }

    if (correlation.findings && correlation.findings.length > 0) {
      return {
        type: correlationType,
        explanation: correlation.findings[0],
        recommendation: this.getRecommendationForCorrelation(correlationType),
        expectedImprovement: 'Better overall health outcomes'
      };
    }

    return null;
  }

  getRecommendationForCorrelation(correlationType) {
    const recommendations = {
      workoutToSkin: 'Add recovery days and stress management techniques',
      sleepToSkin: 'Maintain consistent 7-9 hour sleep schedule',
      nutritionToSkin: 'Focus on nutrient-dense whole foods',
      supplementEffects: 'Continue consistent supplement routine'
    };

    return recommendations[correlationType] || 'Monitor and adjust based on results';
  }

  prioritizeInsights(insights) {
    // Sort by impact and confidence
    return insights.sort((a, b) => {
      const priorityA = this.calculatePriority(a);
      const priorityB = this.calculatePriority(b);
      return priorityB - priorityA;
    });
  }

  calculatePriority(insight) {
    let priority = 5;

    if (insight.type === 'nutritional_deficiency') {
      priority = 9;
    } else if (insight.type === 'sleep_quality') {
      priority = 8;
    } else if (insight.type === 'workout_stress') {
      priority = 7;
    }

    return priority;
  }
}

export default CrossCorrelationEngine;
