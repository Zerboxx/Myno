$files = @(
    "src\agent.ts",
    "src\agent\studio-context.ts",
    "src\agent\studio-resolver.ts",
    "src\agent\tool-runtime.ts",
    "src\tools\registry.ts",
    "src\tools\roblox\mcp-tools.ts",
    "src\tools\roblox\mcp-client.ts",
    "src\agent\verifier-agent.ts",
    "src\agent\evidence.ts",
    "src\agent\agent-state.ts",
    "src\agent\plan.ts"
)

Remove-Item agent-review.txt -ErrorAction SilentlyContinue

foreach ($file in $files) {
    Add-Content agent-review.txt ""
    Add-Content agent-review.txt "============================================================"
    Add-Content agent-review.txt "FILE: $file"
    Add-Content agent-review.txt "============================================================"
    Get-Content $file | Add-Content agent-review.txt
}