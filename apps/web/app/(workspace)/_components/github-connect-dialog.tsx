"use client";

import { useState, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  GithubLogo,
  X,
  CheckCircle,
  PlugsConnected,
  Trash,
} from "@phosphor-icons/react";

interface GitHubConnectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GitHubConnectDialog({ open, onClose }: GitHubConnectDialogProps) {
  const { selectedBoardId, githubConnected, setGithubConnected } = useWorkspaceStore();

  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedRepo, setConnectedRepo] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!selectedBoardId || !repo.trim() || !token.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo.trim(), token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Connection failed");
        return;
      }

      setGithubConnected(true);
      setConnectedRepo(data.repo);
      setToken("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, repo, token, setGithubConnected]);

  const handleDisconnect = useCallback(async () => {
    if (!selectedBoardId) return;

    setLoading(true);
    try {
      await fetch(`/api/boards/${selectedBoardId}/github`, { method: "DELETE" });
      setGithubConnected(false);
      setConnectedRepo(null);
      setRepo("");
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, setGithubConnected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl p-6"
        style={{
          width: 440,
          background: "rgba(255, 255, 255, 0.98)",
          border: "1px solid rgba(15, 23, 42, 0.12)",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <GithubLogo size={20} style={{ color: "#0F172A" }} />
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A" }}>
              Connect GitHub Repository
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            style={{ color: "#64748B" }}
          >
            <X size={16} />
          </button>
        </div>

        {githubConnected && connectedRepo ? (
          <div>
            <div
              className="flex items-center gap-3 p-3 rounded-xl mb-4"
              style={{ background: "rgba(22, 163, 74, 0.08)", border: "1px solid rgba(22, 163, 74, 0.20)" }}
            >
              <CheckCircle size={20} style={{ color: "#16A34A" }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#15803D" }}>Connected</div>
                <div style={{ fontSize: "12px", color: "#16A34A" }}>{connectedRepo}</div>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer hover:bg-red-50"
              style={{ border: "1px solid rgba(239, 68, 68, 0.25)", color: "#DC2626" }}
            >
              <Trash size={14} />
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <div className="space-y-3 mb-4">
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                  Repository (owner/name)
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="e.g. acme/product-api"
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ border: "1px solid rgba(15, 23, 42, 0.15)", color: "#0F172A" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ border: "1px solid rgba(15, 23, 42, 0.15)", color: "#0F172A" }}
                />
                <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                  Needs <code>repo</code> scope. Token is stored encrypted per-board.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded-lg text-[12px]" style={{ background: "rgba(239, 68, 68, 0.08)", color: "#DC2626", border: "1px solid rgba(239, 68, 68, 0.20)" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading || !repo.trim() || !token.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all cursor-pointer disabled:opacity-40"
              style={{ background: "#0F172A", color: "#FFFFFF" }}
            >
              <PlugsConnected size={14} />
              {loading ? "Connecting..." : "Connect Repository"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
