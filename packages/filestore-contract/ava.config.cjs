require('util').inspect.defaultOptions.depth = 5; // Increase AVA's printing depth

/*


HhsxaH2558ZnF6wr1FdSWXUFR845mPNSjisPd8KsnWAr
ed25519:3bC6o9koZqpkf6gpjJoM7RwpqHz9vRAYMnSEFPV3XHTQz1aHV6x6JBXtrbpNDzXZ4jd3uzJdQb1V3mWqoCcRCe2r

ed25519:qYeykgzNc8HYLw477GURJCXU5J1qVeyARdYVXP1bCA1PC4vVB5bJ7wgVgGbhuyLdofYjK873g6DC4PXPWRekXQJ

effort north benefit sadness fox trap mushroom slight rabbit solution object spike
{\"account_id\":\"filestore.testnet\",\"public_key\":\"ed25519:HhsxaH2558ZnF6wr1FdSWXUFR845mPNSjisPd8KsnWAr\",\"private_key\":\"ed25519:3bC6o9koZqpkf6gpjJoM7RwpqHz9vRAYMnSEFPV3XHTQz1aHV6x6JBXtrbpNDzXZ4jd3uzJdQb1V3mWqoCcRCe2r\"}


* */

module.exports = {
  timeout: '10000',
  files: ['sandbox-ts/*.ava.ts'],
  failWithoutAssertions: false,
  extensions: {
		js: true,
		ts: 'module'
	},
  require: ['ts-node/register', 'near-workspaces'],
  "nodeArguments": [
		"--import=tsimp"
	]
};