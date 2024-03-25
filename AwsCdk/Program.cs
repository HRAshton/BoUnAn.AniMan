using Amazon.CDK;
using Bounan.AniMan.AwsCdk;

var app = new App();
_ = new AniManCdkStack(app, "Bounan-AniMan", new StackProps());
app.Synth();