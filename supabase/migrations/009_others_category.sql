-- Rename the previous Build activity category without changing existing plans.
update public.plans set category = 'Others' where category = 'Build';
