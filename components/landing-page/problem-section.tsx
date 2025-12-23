import { Container } from "@/components/craft";
import { Check, X } from "lucide-react";
import { whatChatbaseProvides, whatPeopleCreate, painPoints } from "@/content/data/landing-page";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export const ProblemSection = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <Container>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-4 uppercase tracking-wider text-sm">The Problem</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 font-heading">
              You generate structured data in AI Assistants every day
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-6">What you create:</h3>
              {problems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-background border">
                  <TableProperties className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-body">{item}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-6 text-destructive">But then you copy-paste manually... 😫</h3>
              {pains.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <span className="text-destructive">✗</span>
                  <span className="font-body text-muted-foreground">{item}</span>
                </div>
              ))}
            </div> */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">AI Chat → What You Create</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {whatPeopleCreate.map((item) =>
                    <div className="flex items-center gap-2" key={item}>
                      <Check className="size-4" />
                      <p>{item}</p>
                    </div>)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">Copy-Paste → What Hurts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {painPoints.map((item) =>
                    <div className="flex items-center gap-2" key={item}>
                      <X className="size-4" />
                      <p>{item}</p>
                    </div>)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">Chatbase → What You Get</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {whatChatbaseProvides.map((item) =>
                    <div className="flex items-center gap-2" key={item}>
                      <Check className="size-4" />
                      <p>{item}</p>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-16">
            <p className="text-2xl font-semibold font-heading">
              This is broken. <span className="text-primary">We fixed it.</span>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};
