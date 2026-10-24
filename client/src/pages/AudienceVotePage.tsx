import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CurtainFrame } from "../components/Decor";
import { api, extractError } from "../utils/api";
import { getVoterId } from "../utils/voteUrl";
import type { PublicState } from "../types";

export default function AudienceVotePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<PublicState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    api
      .get("/state")
      .then((res) => setState(res.data))
      .catch(() => setState(null));
  }, []);

  const activeRoundMatches = !!state && state.status === "voting_open" && state.audienceVoteToken === token;
  const choices = useMemo(() => {
    if (!state) return [];
    return Array.from({ length: state.scoringMax - state.scoringMin + 1 }, (_, index) => state.scoringMin + index);
  }, [state]);

  const submitVote = async (score: number) => {
    setBusy(true);
    setMessage("");
    try {
      await api.post("/audience/vote", { token, score, voterId: getVoterId() });
      setVoted(true);
      setMessage("Your vote was recorded.");
    } catch (error) {
      setMessage(extractError(error));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <CurtainFrame>
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <div className="gold-frame bg-dark-plum/80 p-8 max-w-lg">
            <h1 className="font-serif text-4xl text-parchment">Missing ballot</h1>
            <p className="text-parchment/70 mt-4">This voting page needs a valid round QR token.</p>
            <Link to="/audience" className="btn-gold inline-block mt-6 px-6 py-3 text-sm tracking-wider uppercase">
              Back to audience screen
            </Link>
          </div>
        </div>
      </CurtainFrame>
    );
  }

  return (
    <CurtainFrame>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="gold-frame bg-dark-plum/85 p-6 sm:p-8 w-full max-w-2xl">
          <div className="text-center mb-6">
            <p className="label-caps text-antique-gold tracking-[0.35em] text-xs">Audience voting</p>
            <h1 className="font-serif text-4xl sm:text-5xl mt-2 text-parchment">Cast your vote</h1>
          </div>

          {!state ? (
            <p className="text-parchment/70 text-center">Loading the current round…</p>
          ) : state.status !== "voting_open" ? (
            <div className="text-center space-y-4">
              <p className="font-serif text-3xl text-parchment/80">Voting is closed.</p>
              <p className="text-parchment/60">This round has ended. Thanks for joining the audience.</p>
              <Link to="/audience" className="btn-outline inline-block px-5 py-3 text-xs tracking-wider uppercase">
                Return to stage
              </Link>
            </div>
          ) : !activeRoundMatches ? (
            <div className="text-center space-y-4">
              <p className="font-serif text-3xl text-parchment/80">This ballot is no longer active.</p>
              <p className="text-parchment/60">Please scan the latest QR code from the audience screen.</p>
              <Link to="/audience" className="btn-gold inline-block px-5 py-3 text-xs tracking-wider uppercase">
                Open audience screen
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <p className="label-caps text-parchment/60 tracking-[0.32em]">Now performing</p>
                <h2 className="font-serif text-4xl sm:text-5xl text-antique-gold mt-2">
                  {state.activeParticipant?.name ?? "Loading..."}
                </h2>
                {state.activeParticipant?.performance_title && (
                  <p className="font-serif italic text-parchment/65 text-xl mt-2">
                    “{state.activeParticipant.performance_title}”
                  </p>
                )}
              </div>

              {voted && (
                <div className="mb-5 rounded-sm border border-[#9fd39f]/60 bg-[#9fd39f]/10 px-4 py-3 text-center text-[#dff7df]">
                  {message || "Your vote was recorded."}
                </div>
              )}

              {message && !voted && (
                <div className="mb-5 rounded-sm border border-muted-rose/60 bg-muted-rose/10 px-4 py-3 text-center text-muted-rose">
                  {message}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {choices.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => submitVote(value)}
                    disabled={busy || voted}
                    className="btn-gold py-4 text-xl font-semibold disabled:opacity-60"
                  >
                    {value}
                  </button>
                ))}
              </div>

              <p className="text-center text-parchment/50 text-xs mt-5 tracking-[0.18em] uppercase">
                Choose a score from {state.scoringMin} to {state.scoringMax}
              </p>
            </>
          )}
        </div>
      </div>
    </CurtainFrame>
  );
}
