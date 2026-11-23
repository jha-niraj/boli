# Boli chat on a Hugging Face Space: llama.cpp's official server image, nothing else.
# The image's entrypoint is /app/llama-server, so CMD below is only its arguments.
FROM ghcr.io/ggml-org/llama.cpp:server

# Spaces run the container as a non-root user; /tmp is writable, so the model downloads there
# on every cold start (about 4.6 GB, fast inside Hugging Face's network).
ENV LLAMA_CACHE=/tmp/llama-cache

# LLAMA_API_KEY is NOT set here. It comes from the Space secret of the same name, and
# llama-server reads it from the environment, so every request needs "Authorization: Bearer <key>".

EXPOSE 8080

# -hf ...:Q4_0     the model chosen in learn chapter 1.3 (Gemma 4 E4B, 4-bit)
# --no-mmproj      text only, skip the 1 GB image add-on
# -c 8192 -np 2    2 slots (2 conversations at once) sharing one 8,192-token context memory
# --jinja --reasoning auto  each request chooses thinking (Boli sends enable_thinking=false unless asked)
# -t 2             the free hardware has 2 vCPUs
# --host 0.0.0.0   reachable from outside the container (safe only because of the API key)
CMD ["-hf", "ggml-org/gemma-4-E4B-it-GGUF:Q4_0", "--no-mmproj", "-c", "8192", "-np", "2", "--jinja", "--reasoning", "auto", "-t", "2", "--host", "0.0.0.0", "--port", "8080"]
