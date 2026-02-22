# Fitness Tracker Web App

## Phase 1 Requirements + Design Guide (Mobile-First, Dark Theme)

Generated on: 2026-02-22

------------------------------------------------------------------------

## Purpose

A personalized, mobile-first web app to log gym sessions (cardio +
strength + holds) and view progress over time via clean analytics cards
and interactive charts.

Phase 1 focuses on a strong core loop: Open app → View dashboard → Add
session → See updated analytics → Edit past sessions.

------------------------------------------------------------------------

# 1. Navigation Structure (Phase 1)

Bottom tab bar with 2 tabs:

-   **Dashboard**
-   **Sessions**

Primary CTA: **+ Add Session** (accent color)

------------------------------------------------------------------------

# 2. Design System

## Theme

-   Predominantly dark theme
-   Sage green accent (initial theme)
-   Card-based layout
-   Mobile-first spacing

## Suggested Color Palette

-   Background: #0B0F12\
-   Card Surface: #12181D\
-   Border: #1E2A31\
-   Primary Text: #E7EEF3\
-   Secondary Text: #9AA8B4\
-   Accent (Sage Green): #86C8A3\
-   Accent Hover: #72B691\
-   Danger: #FF4D4D

Accent used for: - Add Session button - Selected tab - Primary chart
series - Key metrics

------------------------------------------------------------------------

# 3. Dashboard Requirements

## Greeting Section

-   "Hey Matt 👋"
-   "Last session: \[date\] • Weight: \[kg\]"

------------------------------------------------------------------------

## Weight Tracking

### Inputs

-   Weight (kg) logged at start of each session

### Outputs

1.  Weight Over Sessions Chart (Line Graph)
2.  Rolling Average (last 7 sessions default)
3.  Deviation (latest weight - rolling average)

Interactive tooltip: - Date - Weight - Rolling average (optional)

------------------------------------------------------------------------

## Running Analytics

### Totals

-   Last 30 days
-   Last 7 days
-   Today

### Best 5km

-   Lowest duration where distance = 5km
-   Display date achieved

### Charts

1.  Distance Per Session (Bar or Line)
2.  Speed Per Session (Line)
3.  Optional Dual-Axis Chart (Distance + Speed)

Tooltip shows: - Date - Distance - Speed - Duration

------------------------------------------------------------------------

## Strength Analytics

### Total Weight Lifted

Volume per set = weight × reps\
Total volume aggregated for: - Last 30 days - Last 7 days - Today

### Muscle Group Focus Chart

Stacked Bar Chart per session showing: - Biceps - Triceps - Back -
Chest - Shoulders - Legs - Core

Tooltip shows: - Session date - Muscle group - Volume total

------------------------------------------------------------------------

# 4. Add Session Requirements

## Session Fields

-   Session date (default today)
-   Weight (kg)
-   Session notes (optional)

## Entry Types

### Cardio

-   Exercise name (smart search)
-   Duration
-   Distance
-   Speed
-   Notes

### Strength

-   Exercise name (smart search)
-   Sets repeater:
    -   weight
    -   reps
-   Notes

### Timed Hold

-   Exercise name
-   Sets
-   Seconds per set
-   Notes

Validation: - At least 1 entry required - Cardio must have duration or
distance - Strength sets must have reps

------------------------------------------------------------------------

# 5. Sessions Tab

-   List of sessions (newest first)
-   Session detail view
-   Edit session
-   Delete session (with confirmation)

------------------------------------------------------------------------

# 6. Database (Supabase)

## Tables

### sessions

-   id
-   user_id
-   session_date
-   weight_kg
-   notes
-   created_at

### entries

-   id
-   session_id
-   exercise_id
-   exercise_name
-   type (cardio/strength/hold)
-   duration_seconds
-   distance_km
-   speed_kmh
-   notes

### strength_sets

-   id
-   entry_id
-   set_index
-   weight_kg
-   reps

### exercises

-   id
-   user_id (nullable for global)
-   name
-   category
-   primary_muscle_group
-   secondary_muscle_group

RLS enabled so users only access their own data.

------------------------------------------------------------------------

# 7. Analytics Definitions

### Time Windows

-   30 days
-   7 days
-   Today

### Weight Rolling Average

Average of last 7 sessions (default).\
Deviation = latest weight - rolling average.

### Running Calculations

If speed missing: speed = distance / (duration / 3600)

If distance missing: distance = speed × (duration / 3600)

### Strength Volume

Volume per set = weight × reps\
Total volume = sum across time window.

------------------------------------------------------------------------

# 8. Phase 1 Definition of Done

-   Dark sage green themed UI
-   Interactive charts with tooltips
-   Weight + running + strength analytics functional
-   Add/Edit/Delete sessions
-   Supabase connected with RLS
-   Deployed to Vercel
-   Mobile responsive

------------------------------------------------------------------------

End of Phase 1 Guide
