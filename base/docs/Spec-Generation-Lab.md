# Spec Generation Lab

This endpoint lets you test analyzer-spec prompts without running the full job pipeline.

## Endpoint

`POST /api/video-agents/spec-lab`

## Environment

Set the OpenAI API key in the server environment:

```bash
export OPENAI_API_KEY=...
export OPENAI_SPEC_MODEL=gpt-4o-mini
```

If the key has been pasted into chat or committed anywhere, rotate it before using it.

## Prompt Variants

- `baseline_contract`
  Uses a strict contract and schema only.
- `reasoned_contract`
  Uses the same contract, but explicitly asks the model to infer exercise-specific constraints internally before returning JSON.

## Dry Run

Use `dryRun: true` to inspect the exact prompt without calling the model.

```bash
curl -X POST http://localhost:3000/api/video-agents/spec-lab \
  -H 'Content-Type: application/json' \
  -d '{
    "exerciseName": "bicep curl",
    "promptVariant": "reasoned_contract",
    "dryRun": true
  }'
```

## Real Call

```bash
curl -X POST http://localhost:3000/api/video-agents/spec-lab \
  -H 'Content-Type: application/json' \
  -d '{
    "exerciseName": "bicep curl",
    "promptVariant": "reasoned_contract",
    "developerNote": "Prefer a conservative MVP spec for rep counting and posture checks."
  }'
```

## Suggested First Comparisons

Run the same exercise through both prompt variants:

- `bicep curl`
- `lateral raise`
- `shoulder press`

Check:

- whether the camera setup matches the exercise
- whether phases are sensible
- whether a rep-incrementing transition exists
- whether the form checks are minimal and exercise-relevant
- whether the spec compiles cleanly

## Recommended Next Step

Once the prompt variant is stable, add simulation-based evaluation so every spec can be tested against generated landmark sequences and a skeleton replay viewer.
