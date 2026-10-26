import React from 'react';
import {
  BookOpen,
  Feather,
  Languages,
  PenTool,
  Calculator,
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  Globe,
  Compass,
  Cpu,
  GraduationCap
} from 'lucide-react';

interface SubjectIconProps {
  name: string;
  className?: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ name, className = 'w-6 h-6' }) => {
  switch (name) {
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Feather':
      return <Feather className={className} />;
    case 'Languages':
      return <Languages className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'Sigma':
      return <Sigma className={className} />;
    case 'Atom':
      return <Atom className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Dna':
      return <Dna className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    default:
      return <GraduationCap className={className} />;
  }
};
