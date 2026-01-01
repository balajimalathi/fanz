interface SubHeadingProps {
  title: string;
  description?: string;
}

export const SubHeading: React.FC<SubHeadingProps> = ({
  title,
  description
}) => {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {description && <p className="text-muted-foreground text-sm pt-2">
        {description}
      </p>} 
    </div>
  );
};
