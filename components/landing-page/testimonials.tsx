import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { USERS } from "@/lib/constants";
import { SectionHeader } from "./section-header";
import { Section } from "../craft";

// Duplicate users array for seamless infinite scrolling
const DUPLICATED_USERS = [...USERS, ...USERS];

export function Testimonials() {
  return (
    <Section id="testimonials" className="container py-16 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center mb-12">
        <SectionHeader title="Trusted by all" badge="Testimonials" badgeColor="cyan" description="Join thousands of satisfied users who rely on our platform for their personal and professional productivity needs." />
      </div>

      <div
        className={cn(
          "relative -mx-10 flex flex-col gap-6 overflow-hidden pb-10 md:mx-0",
          "before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-20 before:bg-linear-to-r before:from-background before:to-transparent md:before:w-72",
          "after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-20 after:bg-linear-to-l after:from-background after:to-transparent md:after:w-72"
        )}
      >
        {/* Row 1: Left to Right */}
        <div
          className={cn(
            "flex flex-nowrap gap-6",
            "animate-slide"
          )}
        >
          {DUPLICATED_USERS.map((user, i) => (
            <Card
              key={`row1-${user.name}-${i}`}
              className="w-[28rem] shrink-0 rounded-xl duration-300 hover:shadow-md dark:bg-gradient-to-br dark:from-border/50 dark:to-background"
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage
                      src={`/placeholders/avatar-${(i % USERS.length) + 1}.png`}
                      alt={`Avatar of ${user.name}`}
                      loading="lazy"
                    />
                    <AvatarFallback>
                      {user.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <CardTitle className="drop-shadow-2xl">{user.name}</CardTitle>
                    <CardDescription>
                      @{user.name.toLocaleLowerCase()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-[15px] leading-5">{user.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: Right to Left */}
        <div
          className={cn(
            "flex flex-nowrap gap-6",
            "animate-slide-reverse"
          )}
        >
          {DUPLICATED_USERS.map((user, i) => (
            <Card
              key={`row2-${user.name}-${i}`}
              className="w-[28rem] shrink-0 rounded-xl duration-300 hover:shadow-md dark:bg-gradient-to-br dark:from-border/50 dark:to-background"
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage
                      src={`/placeholders/avatar-${(i % USERS.length) + 1}.png`}
                      alt={`Avatar of ${user.name}`}
                      loading="lazy"
                    />
                    <AvatarFallback>
                      {user.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <CardTitle className="drop-shadow-2xl">{user.name}</CardTitle>
                    <CardDescription>
                      @{user.name.toLocaleLowerCase()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-[15px] leading-5">{user.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}
