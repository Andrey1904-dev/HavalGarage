import { ButtonLink, EmptyState } from '../components/ui'
import { CarIcon } from '../components/icons'
import { useSeo } from '../utils/seo'

/** Страница «не найдено»: не индексируется, предлагает рабочие разделы. */
export default function NotFoundPage() {
  useSeo({
    title: 'Страница не найдена | HAVAL Гараж',
    description: 'Запрошенная страница не найдена. Перейдите в каталог моделей HAVAL или к кредитному калькулятору.',
    path: '/404',
    noindex: true,
  })

  return (
    <div className="animate-page-enter">
      <EmptyState
        titleAs="h1"
        icon={<CarIcon className="h-6 w-6" />}
        title="Страница не найдена"
        text="Возможно, ссылка устарела или адрес введён с ошибкой. Начните с каталога моделей или подбора по бюджету."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink to="/catalog">Каталог моделей</ButtonLink>
            <ButtonLink to="/budget" variant="secondary">
              Подбор по бюджету
            </ButtonLink>
            <ButtonLink to="/" variant="ghost">
              На главную
            </ButtonLink>
          </div>
        }
      />
    </div>
  )
}
