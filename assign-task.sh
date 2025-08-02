#!/bin/bash
# Task assignment helper

AGENT=$1
TASK=$2
PRIORITY=$3

if [ -z "$AGENT" ] || [ -z "$TASK" ]; then
  echo "Usage: ./assign-task.sh <agent> <task> [priority]"
  exit 1
fi

echo "Task Assignment" >> DAILY_STANDUP.md
echo "Agent: $AGENT" >> DAILY_STANDUP.md
echo "Task: $TASK" >> DAILY_STANDUP.md
echo "Priority: ${PRIORITY:-Normal}" >> DAILY_STANDUP.md
echo "Assigned: $(date)" >> DAILY_STANDUP.md
echo "---" >> DAILY_STANDUP.md

echo "✅ Task assigned to $AGENT"
