import { motion, Variants } from "framer-motion";

const cardSets = {
  ai: [
    {
      src: "/logo/openai.svg",
      angle: "8deg",
    },
    {
      src: "/logo/claude-color.svg",
      angle: "-15deg",
    },
    {
      src: "/logo/gemini-color.svg",
      angle: "-5deg",
    },
    {
      src: "/logo/perplexity-color.svg",
      angle: "10deg",
    },
    {
      src: "/logo/deepseek-color.svg",
      angle: "-5deg",
    },
    {
      src: "/logo/grok.svg",
      angle: "10deg",
    },
  ],
  integration: [
    {
      src: "/logo/google-sheet.svg",
      angle: "8deg",
    },
    {
      src: "/logo/airtable.svg",
      angle: "-15deg",
    },
  ],
};



interface CustomProps {
  index: number;
  angle: string;
}



interface ImagesRevealProps {
  type?: keyof typeof cardSets;
  cards?: { src: string; angle: string }[];
  size?: number;
}


const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.2 },
  visible: (custom: CustomProps) => ({
    opacity: 1,
    scale: 1,
    rotate: parseFloat(custom.angle),
    transition: {
      delay: custom.index * 0.1,
      type: "spring",
      stiffness: 150,
      damping: 20,
      mass: 0.5,
    },
  }),
};


export default function ImagesReveal({
  type = "ai",
  cards,
  size = 40,
}: ImagesRevealProps) {
  const usedCards = cards ?? cardSets[type];
  return (
    <span className="hidden  lg:inline-flex items-center mx-6 align-middle">
      {usedCards.map((card, i) => (
        <motion.img
          key={i}
          className="relative -ml-6 p-2 size-10 rounded-xl border-[3px] border-muted-foreground bg-muted object-cover shadow-lg md:-ml-5 md:size-16"
          src={card.src}
          custom={{ index: i, angle: card.angle }}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{
            scale: 1.05,
            rotate: 0,
            zIndex: 10,
            transition: { type: "spring", stiffness: 150, damping: 20 },
          }}
        />
      ))}
    </span>
  );
}
