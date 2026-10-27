sed -i 's/Possible action types:/Possible action types:\n        - "add_task" (properties: taskName, time)\n        - "log_vitals" (properties: metric, value)/g' server.ts
