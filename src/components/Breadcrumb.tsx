
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbProps {
  items: Array<{
    label: string;
    path: string;
  }>;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <div className="flex items-center gap-1 text-xoul-textSecondary text-sm mb-4">
      {items.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && <ChevronRight size={16} className="mx-1" />}
          {index === items.length - 1 ? (
            <span className="text-white">{item.label}</span>
          ) : (
            <Link to={item.path} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb;
