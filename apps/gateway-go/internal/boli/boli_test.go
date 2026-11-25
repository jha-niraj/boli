package boli

import "testing"

// A table-driven test: one slice of cases, one loop, one t.Run per case so a failure names the case.
func TestCostMicro(t *testing.T) {
	cases := []struct {
		name          string
		input, output int64
		want          int64
	}{
		{name: "nothing", input: 0, output: 0, want: 0},
		{name: "input only", input: 100, output: 0, want: 200},
		{name: "output only", input: 0, output: 10, want: 60},
		{name: "typical call", input: 38, output: 61, want: 38*2 + 61*6},
		{name: "1M output tokens is 6 credits", input: 0, output: 1_000_000, want: 6 * MicroPerCredit},
		{name: "negative never charges", input: -5, output: 0, want: 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := CostMicro(BoliChat, tc.input, tc.output)
			if got != tc.want {
				t.Errorf("CostMicro(%d, %d) = %d, want %d", tc.input, tc.output, got, tc.want)
			}
		})
	}
}

func TestModelByID(t *testing.T) {
	if m, ok := ModelByID("boli-chat"); !ok || m.ContextTokens != 8192 {
		t.Fatalf("boli-chat: got %+v, ok=%v", m, ok)
	}
	if _, ok := ModelByID("gpt-4o"); ok {
		t.Fatal("gpt-4o should not be found")
	}
}

func TestAPIErrorsMatchTS(t *testing.T) {
	want := map[ErrorCode]int{
		ErrInvalidRequest: 400, ErrInvalidAPIKey: 401, ErrInsufficientQuota: 402,
		ErrNotFound: 404, ErrRateLimitExceeded: 429, ErrModelUnavailable: 503,
	}
	if len(APIErrors) != len(want) {
		t.Fatalf("APIErrors has %d codes, want %d", len(APIErrors), len(want))
	}
	for code, status := range want {
		if got := code.Info().Status; got != status {
			t.Errorf("%s: status %d, want %d", code, got, status)
		}
	}
	if got := ErrorCode("typo").Info().Status; got != 500 {
		t.Errorf("unknown code: status %d, want 500", got)
	}
}
