using System;

namespace Bounan.AniMan.AwsCdk;

public class BounanCdkStackConfig
{
	public required string AlertEmail { get; init; }

	public required string LoanApiToken { get; init; }

	public void Validate()
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(AlertEmail, nameof(AlertEmail));
		ArgumentException.ThrowIfNullOrWhiteSpace(LoanApiToken, nameof(LoanApiToken));
	}
}